// Azure Speech Avatar Module
// Handles WebRTC connection and avatar video streaming

// Global avatar variables
let avatarSynthesizer = null;
let peerConnection = null;
let avatarVideoElement = null;
let avatarAudioElement = null;
let avatarContainer = null;
let avatarStatus = null;
let isAvatarEnabled = false;
let isAvatarConnected = false;

// Speech service configuration
const SPEECH_KEY = null; // Will be fetched from backend
const SPEECH_REGION = 'westus2'; // Your region from the screenshot

// Avatar configuration
const AVATAR_CONFIG = {
    character: 'lisa',  // Avatar character
    style: 'casual-sitting',  // Avatar style
    backgroundColor: '#FFFFFFFF'  // White background
};

/**
 * Initialize avatar system
 */
async function initializeAvatar(opts = {}) {
    console.log('Initializing avatar system...');
    
    // Get DOM elements
    avatarVideoElement = opts.videoEl || document.getElementById('avatarVideo');
    avatarAudioElement = opts.audioEl || document.getElementById('avatarAudio');
    avatarContainer = opts.containerEl || document.getElementById('avatarContainer');
    avatarStatus = opts.statusEl || document.getElementById('avatarStatus');
    
    if (!avatarVideoElement || !avatarAudioElement) {
        console.error('Avatar video/audio elements not found');
        return false;
    }
    
    // Check if Speech SDK is loaded
    if (typeof SpeechSDK === 'undefined') {
        console.error('Speech SDK not loaded');
        updateAvatarStatus('Speech SDK not available');
        return false;
    }
    
    try {
        updateAvatarStatus('Initializing avatar...');
        
        // Get ICE token from backend
        const iceData = await getAvatarICEToken();
        if (!iceData) {
            throw new Error('Failed to get ICE token');
        }
        
        // Get speech credentials from backend (passed via ICE token endpoint)
        const speechKey = iceData.speechKey || SPEECH_KEY;
        const speechRegion = iceData.speechRegion || SPEECH_REGION;
        
        if (!speechKey || !speechRegion) {
            throw new Error('Speech credentials not available');
        }
        
        // Create speech config
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
        
        // Create avatar config
        const avatarConfig = new SpeechSDK.AvatarConfig(
            AVATAR_CONFIG.character,
            AVATAR_CONFIG.style
        );
        avatarConfig.backgroundColor = AVATAR_CONFIG.backgroundColor;
        
        // Create WebRTC peer connection
        await setupPeerConnection(iceData);
        
        // Create avatar synthesizer
        avatarSynthesizer = new SpeechSDK.AvatarSynthesizer(speechConfig, avatarConfig);
        
        // Start avatar
        updateAvatarStatus('Connecting to avatar service...');
        await avatarSynthesizer.startAvatarAsync(peerConnection);
        
        isAvatarConnected = true;
        isAvatarEnabled = true;
        updateAvatarStatus('Avatar connected');
        
        // Show avatar container
        if (avatarContainer) {
            avatarContainer.classList.remove('hidden');
        }
        
        console.log('Avatar initialized successfully');
        return true;
        
    } catch (error) {
        console.error('Error initializing avatar:', error);
        updateAvatarStatus('Failed to connect avatar: ' + error.message);
        isAvatarEnabled = false;
        return false;
    }
}

/**
 * Get ICE server token from backend
 */
async function getAvatarICEToken() {
    try {
        const response = await fetch('/api/avatar/ice-token');
        if (!response.ok) {
            throw new Error('Failed to fetch ICE token');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching ICE token:', error);
        return null;
    }
}

/**
 * Setup WebRTC peer connection
 */
async function setupPeerConnection(iceData) {
    return new Promise((resolve, reject) => {
        try {
            // Parse ICE server info
            const iceServers = [];
            
            if (iceData.Urls && iceData.Urls.length > 0) {
                const turnUrls = iceData.Urls.filter(url => url.startsWith('turn:'));
                const stunUrls = iceData.Urls.filter(url => url.startsWith('stun:'));

                if (stunUrls.length > 0) {
                    iceServers.push({ urls: stunUrls });
                }
                if (turnUrls.length > 0) {
                    iceServers.push({
                        urls: turnUrls,
                        username: iceData.Username || '',
                        credential: iceData.Password || ''
                    });
                }
            }
            
            console.log('Creating peer connection with ICE servers:', iceServers);
            
            // Create peer connection
            peerConnection = new RTCPeerConnection({
                iceServers: iceServers
            });
            
            // Handle incoming tracks (video and audio)
            peerConnection.ontrack = (event) => {
                console.log('Received track:', event.track.kind);
                
                if (event.track.kind === 'video' && avatarVideoElement) {
                    const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
                    avatarVideoElement.srcObject = stream;
                    console.log('Video track connected');
                }
                
                if (event.track.kind === 'audio' && avatarAudioElement) {
                    const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
                    avatarAudioElement.srcObject = stream;
                    console.log('Audio track connected');
                }
            };

            // Fallback: also listen to addstream (older implementations)
            peerConnection.onaddstream = (event) => {
                if (event.stream) {
                    if (avatarVideoElement) avatarVideoElement.srcObject = event.stream;
                    if (avatarAudioElement) avatarAudioElement.srcObject = event.stream;
                    console.log('Stream attached via onaddstream');
                }
            };
            
            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', peerConnection.connectionState);
                updateAvatarStatus('Connection: ' + peerConnection.connectionState);
                
                if (peerConnection.connectionState === 'connected') {
                    updateAvatarStatus('Avatar ready');
                } else if (peerConnection.connectionState === 'failed') {
                    updateAvatarStatus('Connection failed');
                    isAvatarConnected = false;
                }
            };
            
            // Handle ICE connection state changes
            peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', peerConnection.iceConnectionState);
            };
            
            // Add transceivers for video and audio
            peerConnection.addTransceiver('video', { direction: 'sendrecv' });
            peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
            
            resolve();
            
        } catch (error) {
            console.error('Error setting up peer connection:', error);
            reject(error);
        }
    });
}

/**
 * Speak text using avatar
 */
async function speakWithAvatar(text) {
    if (!isAvatarEnabled || !avatarSynthesizer) {
        console.warn('Avatar not available, using fallback');
        return false;
    }
    
    try {
        console.log('Speaking with avatar:', text);
        updateAvatarStatus('Speaking...');
        
        const result = await avatarSynthesizer.speakTextAsync(text);
        
        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log('Avatar speech completed successfully');
            updateAvatarStatus('Avatar ready');
            return true;
        } else {
            console.error('Avatar speech failed:', result.reason);
            if (result.reason === SpeechSDK.ResultReason.Canceled) {
                const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(result);
                console.error('Cancellation reason:', cancellationDetails.reason);
                if (cancellationDetails.reason === SpeechSDK.CancellationReason.Error) {
                    console.error('Error details:', cancellationDetails.errorDetails);
                }
            }
            return false;
        }
    } catch (error) {
        console.error('Error speaking with avatar:', error);
        updateAvatarStatus('Speech error');
        return false;
    }
}

/**
 * Close avatar connection
 */
function closeAvatar() {
    if (avatarSynthesizer) {
        try {
            avatarSynthesizer.close();
            console.log('Avatar connection closed');
        } catch (error) {
            console.error('Error closing avatar:', error);
        }
        avatarSynthesizer = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    isAvatarConnected = false;
    isAvatarEnabled = false;
    
    if (avatarContainer) {
        avatarContainer.classList.add('hidden');
    }
}

/**
 * Update avatar status message
 */
function updateAvatarStatus(message) {
    if (avatarStatus) {
        avatarStatus.textContent = message;
    }
    console.log('Avatar status:', message);
}

/**
 * Toggle avatar visibility
 */
function toggleAvatarVisibility(show) {
    if (avatarContainer) {
        if (show) {
            avatarContainer.classList.remove('hidden');
        } else {
            avatarContainer.classList.add('hidden');
        }
    }
}

/**
 * Check if avatar is available and connected
 */
function isAvatarAvailable() {
    return isAvatarEnabled && isAvatarConnected && avatarSynthesizer !== null;
}

/**
 * Force stop avatar speech and clear audio
 */
async function forceStopAvatar() {
    if (avatarSynthesizer) {
        try {
            await avatarSynthesizer.stopSpeakingAsync();
            // Limpiar el buffer de audio
            if (avatarAudioElement) {
                avatarAudioElement.pause();
                avatarAudioElement.currentTime = 0;
            }
            console.log('Avatar speech force stopped');
            updateAvatarStatus('Ready for new slide');
        } catch (error) {
            console.error('Error force stopping avatar:', error);
        }
    }
}

/**
 * Stop avatar from speaking
 */
async function stopAvatarSpeaking() {
    await forceStopAvatar();
}

// Export functions for use in script.js
window.avatarModule = {
    initialize: initializeAvatar,
    speak: speakWithAvatar,
    close: closeAvatar,
    isAvailable: isAvatarAvailable,
    toggleVisibility: toggleAvatarVisibility,
    updateStatus: updateAvatarStatus,
    stopSpeaking: stopAvatarSpeaking,
    forceStop: forceStopAvatar
};

// Make the stopSpeaking function globally available for the presentation controller
window.avatarController = {
    stopSpeaking: stopAvatarSpeaking,
    forceStop: forceStopAvatar
};
