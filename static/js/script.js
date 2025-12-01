// 🔹 DOM Elements
let modeToggleBtn = null;
let modeLabel = null;
let modeIcon = null;
let inputSection = null;
let sendBtn = null;
let statusSection = null;
let userInput = null;
let typingIndicator = null;
let chatMessages = null;
let startChatBtn = null;
let landingScreen = null;
let chatScreen = null;
let chatInitialized = false;

// 🔹 Global Variables
// Force text-only mode (no speech-to-text). User types; bot speaks via TTS.
let voicemodestatus = false;
let audioPlayer = null;
let isMuted = false;
let isAITalking = false;

// Initialize all DOM elements and event listeners
function initializeApp() {
    console.log('Initializing application...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Skip voice recognition when in forced text-only mode
    if (voicemodestatus) {
        initializeVoiceRecognition();
    } else {
        console.log('Text-only mode: voice recognition initialization skipped');
    }
    
    // Set up all event listeners
    setupEventListeners();
    
    console.log('Application initialized successfully');
}

// Initialize DOM elements
function initializeDOMElements() {
    // Initialize DOM elements
    modeToggleBtn = document.getElementById("modeToggleBtn");
    modeLabel = document.getElementById("modeLabel");
    modeIcon = document.getElementById("modeIcon");
    inputSection = document.getElementById("textInputSection");
    sendBtn = document.getElementById("sendBtn");
    statusSection = document.getElementById("voiceStatus");
    userInput = document.getElementById("userInput");
    typingIndicator = document.getElementById("typingIndicator");
    chatMessages = document.getElementById("chatMessages");
    startChatBtn = document.querySelector(".start-chat-btn");
    landingScreen = document.getElementById("landingScreen");
    chatScreen = document.getElementById("chatScreen");
    
    console.log('DOM elements initialized:', !!startChatBtn);
}

// Set up all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Chat start button
    if (startChatBtn) {
        // Ensure button is enabled and clickable
        startChatBtn.removeAttribute('disabled');
        startChatBtn.style.pointerEvents = 'auto';
        startChatBtn.addEventListener('click', handleStartChatClick);
        window.startApp = handleStartChatClick;
    } else {
        console.error('Start chat button not found in DOM');
    }

    // Global delegation fallback
    document.addEventListener('click', (event) => {
        if (event.target && event.target.closest && event.target.closest('.start-chat-btn')) {
            handleStartChatClick(event);
        }
    });
    
    // Mode toggle button
    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', toggleMode);
    }
    
    // Send button and user input
    if (sendBtn && userInput) {
        // Click event for send button
        sendBtn.addEventListener('click', () => {
            const message = userInput.value.trim();
            if (message) {
                sendMessageToAI(message);
                userInput.value = '';
                sendBtn.disabled = true;
            }
        });
        
        // Input events for text field
        userInput.addEventListener('input', handleInputChange);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && userInput.value.trim()) {
                sendBtn.click();
            }
        });
    }
    
    console.log('Event listeners set up successfully');
}

// Toggle voice/text mode (text-only demo keeps voice disabled)
function toggleMode(event) {
    if (event) {
        event.preventDefault();
    }
    displayMessage('Este asistente está en modo texto únicamente. Por favor escribe tu mensaje.', 'system');
}

// Initialize Voice Recognition and WebSpeech variables
let recognition = null;
let isWebSpeechSupported = false;

// Check and Initialize Voice Recognition
async function initializeVoiceRecognition() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("No media devices support");
            displayMessage("Your browser doesn't support microphone access. Switching to text mode.", 'system');
            voicemodestatus = false;
            modeToggleBtn.classList.add("toggled");
            modeLabel.textContent = "Text Mode";
            inputSection.classList.remove("hidden");
            return false;
        }

        // Test microphone access
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            console.log("Microphone access granted");
        } catch (err) {
            console.error("Microphone access error:", err);
            displayMessage("Could not access microphone. Switching to text mode.", 'system');
            voicemodestatus = false;
            modeToggleBtn.classList.add("toggled");
            modeLabel.textContent = "Text Mode";
            inputSection.classList.remove("hidden");
            return false;
        }

        // Initialize Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            isWebSpeechSupported = true;
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;  // Cambiado a false para evitar auto-escucha
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                const result = event.results[event.results.length - 1];
                if (result.isFinal) {
                    const transcript = result[0].transcript.trim();
                    if (transcript) {
                        displayMessage(transcript, 'user');
                        sendMessageToAI(transcript);
                    }
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech') {
                    // Esperar 20 segundos antes de mostrar el mensaje de no-speech
                    setTimeout(() => {
                        displayMessage("Parece que no estás hablando. ¿Hay algo en lo que pueda ayudarte? Puedes intentar hablar de nuevo o usar el modo texto si lo prefieres.", 'system');
                        setTimeout(startRecording, 2000);
                    }, 20000);
                    // Mostrar mensaje de espera mientras tanto
                    displayMessage("Waiting for your voice...", 'system');
                } else {
                    displayMessage("There was a problem with speech recognition. Could you try again?", 'system');
                    setTimeout(startRecording, 2000);
                }
            };

            recognition.onend = () => {
                console.log('Recognition ended');
                // No reiniciamos automáticamente para evitar bucles
            };

            console.log('Voice recognition initialized successfully');
            return true;
        } else {
            displayMessage("Your browser doesn't support speech recognition. Switching to text mode.", 'system');
            voicemodestatus = false;
            modeToggleBtn.classList.add("toggled");
            modeLabel.textContent = "Text Mode";
            inputSection.classList.remove("hidden");
            return false;
        }
    } catch (error) {
        console.error("Error initializing speech recognition:", error);
        displayMessage("There was a problem initializing speech recognition. Switching to text mode.", 'system');
        voicemodestatus = false;
        modeToggleBtn.classList.add("toggled");
        modeLabel.textContent = "Text Mode";
        inputSection.classList.remove("hidden");
        return false;
    }
}

// Process and send user input to AI
function processUserInput(message) {
    if (!message || !message.trim()) return;
    
    if (voicemodestatus) {
        // En modo voz, el mensaje ya se muestra en otro lugar
        sendMessageToAI(message);
    } else {
        // En modo texto, mostramos el mensaje y lo enviamos
        displayMessage(message, 'user');
        sendMessageToAI(message);
    }
}

function startConversation() {
    console.log("Starting conversation (text-only)...");
    return fetch('/api/start-conversation')
        .then(r => r.json())
        .then(data => {
            if (data.message) {
                displayMessage(data.message, 'assistant');
                // Speak greeting
                playAudioResponse(data.message, true);
            }
        })
        .catch(err => console.error('Start conversation error:', err));
}



// 🔹 Function: Start Chat on Voice Mode
async function showChatScreen() {
    console.log('Starting chat screen initialization...');
    
    try {
        // Show chat screen with smooth transition first
        landingScreen.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for fade out
        landingScreen.classList.add("hidden");
        
        chatScreen.classList.remove("hidden");
        chatScreen.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 50));
        chatScreen.style.opacity = '1';

        // Initialize avatar if available
        if (window.avatarModule) {
            console.log('Initializing avatar...');
            const avatarInitialized = await window.avatarModule.initialize();
            if (avatarInitialized) {
                console.log('Avatar initialized successfully');
            } else {
                console.log('Avatar initialization failed, will use standard TTS');
            }
        }

        // Immediate greeting (no voice recognition)
        await startConversation();
        voicemodestatus = false;

        if (modeToggleBtn && modeLabel && modeIcon && inputSection) {
            modeToggleBtn.classList.add('toggled');
            modeLabel.textContent = 'Text Mode';
            inputSection.classList.remove('hidden');
            
            // Set up UI for voice mode (even though we stay in text mode, keep state synced)
            modeToggleBtn.classList.toggle("toggled", !voicemodestatus);
            modeLabel.textContent = "Voice Mode";
            modeIcon.innerHTML = "";
            const iconSvg = createModeIcon(false);
            modeIcon.appendChild(iconSvg);
            
            // Hide text input in voice mode
            inputSection.classList.toggle("hidden", voicemodestatus);
        } else {
            console.warn('Mode toggle UI elements not found; skipping toggle state updates');
        }
        
        console.log('Chat screen initialized successfully');
        
    } catch (error) {
        console.error('Error in showChatScreen:', error);
        throw new Error('No se pudo iniciar el chat. Por favor, recarga la página.');
    }
}

// Play Audio Response (Text-to-Speech)
async function playAudioResponse(message, skipDisplay = false, wasInterrupted = false) {
    console.log('playAudioResponse called, wasInterrupted:', wasInterrupted, 'voicemodestatus:', voicemodestatus);

    return new Promise(async (resolve) => {
        let playbackResolved = false;
        const restartRecordingIfNeeded = () => {
            if (voicemodestatus && !isFormActive) {
                console.log('Starting recording after audio completion');
                setTimeout(() => {
                    console.log('Attempting to restart recording...');
                    startRecording();
                }, 1000);
            } else if (isFormActive) {
                console.log('Form is active, not restarting recording after audio');
            }
        };

        const conclude = () => {
            if (playbackResolved) {
                return;
            }
            playbackResolved = true;
            restartRecordingIfNeeded();
            resolve();
        };

        if (!message) {
            console.error('No message to play');
            restartRecordingIfNeeded();
            resolve();
            return;
        }

        // Display the message only if skipDisplay is false
        if (!skipDisplay) {
            displayMessage(message, 'assistant');
            handleReceptionistResponse(message);
        }

        const cleanMessage = message.replace(/<script>.*?<\/script>/g, '').trim();
        if (!cleanMessage) {
            console.log('No text content to speak after removing scripts');
            restartRecordingIfNeeded();
            resolve();
            return;
        }

        console.log('Requesting text-to-speech for message:', cleanMessage);
        showTypingIndicator('assistant');

        // Try avatar first
        if (window.avatarModule && window.avatarModule.isAvailable()) {
            console.log('Using avatar for speech synthesis, wasInterrupted:', wasInterrupted);
            try {
                const delay = wasInterrupted ? 300 : 100;
                await new Promise(r => setTimeout(r, delay));
                const success = await window.avatarModule.speak(cleanMessage);
                hideTypingIndicator();

                if (success) {
                    console.log('Avatar speech completed successfully');
                    restartRecordingIfNeeded();
                    resolve();
                    return;
                }

                console.log('Avatar speech failed, falling back to standard TTS');
            } catch (error) {
                hideTypingIndicator();
                console.error('Avatar speech error, falling back to standard TTS:', error);
            }
        }

        try {
            const response = await fetch('/api/text-to-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanMessage })
            });

            console.log('TTS response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const audioBlob = await response.blob();
            console.log('Received audio blob:', audioBlob.type, audioBlob.size, 'bytes');
            hideTypingIndicator();

            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer.remove();
                URL.revokeObjectURL(audioPlayer.src);
            }

            audioPlayer = new Audio(audioUrl);
            audioPlayer.volume = isMuted ? 0 : 1;
            isAITalking = true;

            const cleanup = () => {
                if (audioPlayer) {
                    try {
                        audioPlayer.pause();
                    } catch {}
                }
                URL.revokeObjectURL(audioUrl);
            };

            audioPlayer.oncanplaythrough = () => {
                console.log('Audio can play through, attempting to play...');
                audioPlayer.play()
                    .then(() => {
                        console.log('Audio playing successfully');
                        if (recognition) {
                            recognition.abort();
                        }
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        isAITalking = false;
                        displayMessage('Click anywhere to activate audio', 'system');
                        document.body.addEventListener('click', function playAudioOnce() {
                            audioPlayer.play().catch(console.error);
                            document.body.removeEventListener('click', playAudioOnce);
                        });
                    });
            };

            const audioTimeout = setTimeout(() => {
                console.log('Audio timeout fallback triggered');
                if (voicemodestatus && !isAITalking && !isFormActive) {
                    console.log('Fallback: restarting recording due to timeout');
                    startRecording();
                } else if (isFormActive) {
                    console.log('Timeout fallback but form is active, not restarting recording');
                }
                cleanup();
                conclude();
            }, 30000);

            audioPlayer.onended = () => {
                console.log('Audio finished playing');
                clearTimeout(audioTimeout);
                cleanup();
                isAITalking = false;
                conclude();
            };

            audioPlayer.onerror = () => {
                console.error('Audio error');
                clearTimeout(audioTimeout);
                cleanup();
                isAITalking = false;
                conclude();
            };

            audioPlayer.ontimeupdate = () => {
                console.log(`Audio playback progress: ${audioPlayer.currentTime}/${audioPlayer.duration} seconds`);
            };

        } catch (error) {
            console.error('Error in text-to-speech:', error);
            hideTypingIndicator();
            displayMessage('Lo siento, hubo un problema generando el audio.', 'assistant');
            conclude();
        }
    });
}  

function startRecording() { /* disabled (text-only mode) */ }

function handleStartChatClick(event) {
    if (event) {
        event.preventDefault();
    }

    if (chatInitialized) {
        console.log('Chat already initialized; ignoring duplicate start request');
        return;
    }

    chatInitialized = true;
    console.log('Start chat button clicked');
    showChatScreen().catch(error => {
        console.error('Error showing chat screen:', error);
        displayMessage(error.message, 'system');
        chatInitialized = false;
    });
}
// 🔹 Send Message to AI and Handle Response
window.sendMessageToAI = function(text, silent = false) {
    // Show user message if not silent
    if (!silent) {
        displayMessage(text, 'user');
    }

    let wasInterrupted = false;
    
    // Check if AI is talking and handle interruption
    if (isAITalking && audioPlayer) {
        console.log('Interrupting AI speech...');
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        URL.revokeObjectURL(audioPlayer.src);
        audioPlayer = null;
        isAITalking = false;
        wasInterrupted = true;
        
        // Stop avatar if it's speaking
        if (window.avatarModule && window.avatarModule.isAvailable()) {
            console.log('Stopping avatar speech...');
            window.avatarModule.forceStop();
        }
        
        console.log('AI speech interrupted successfully, wasInterrupted:', wasInterrupted);
    }

    // Send to backend
    fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Received AI response, playing audio...');
        // Pass the interruption flag to playAudioResponse
        playAudioResponse(data.message, false, wasInterrupted);
        // Removed next visitor prompt logic for simplified text-only flow
    })
    .catch(error => {
        console.error('Error sending message:', error);
        displayMessage("Sorry, there was a problem processing your message. Please try again.", 'assistant');
        
        // Force restart recording if in voice mode and there was an error
        if (voicemodestatus && !isFormActive) {
            console.log('Error occurred, forcing recording restart...');
            setTimeout(() => {
                console.log('Executing forced recording restart...');
                startRecording();
            }, 1000);
        } else if (isFormActive) {
            console.log('Error occurred but form is active, not restarting recording');
        }
    });
}

function showTypingIndicator(side = "assistant") {
    const existing = document.getElementById("typingIndicator");
    if (existing) existing.remove();
  
    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.id = "typingIndicator";
  
    if (side === "user") {
      indicator.classList.add("user-indicator");
      indicator.innerHTML = `
      <svg class="typing-mic" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      </svg><div><span class>Recording your message......</span></div>
    `;

    }
    else {
        indicator.classList.add("assistant-indicator");
        for (let i = 0; i < 4; i++) {
            const dot = document.createElement("span");
            indicator.appendChild(dot);
          }
    }
  
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  
  function hideTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.remove();
  }


// 🔹 Function: Create Mode Icon
function createModeIcon(isTextMode) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  if (isTextMode) {
    svg.classList.add("lucide", "lucide-message-circle");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M7.9 20A9 9 0 1 0 4 16.1L2 22Z");
    svg.appendChild(path);
  } else {
    svg.classList.add("lucide", "lucide-volume-2");

    const paths = [
      "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      "M16 9a5 5 0 0 1 0 6",
      "M19.364 18.364a9 9 0 0 0 0-12.728",
    ];

    for (const d of paths) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    }
  }

  return svg;
}

// 🔹 Function: Enable/Disable Send Button
function handleInputChange() {
  const hasText = userInput.value.trim().length > 0;
  sendBtn.disabled = !hasText;
}

// Render chat bubbles in the conversation pane
function displayMessage(text, sender = 'assistant') {
    if (!chatMessages) {
        chatMessages = document.getElementById('chatMessages');
    }
    if (!chatMessages || !text) {
        return;
    }

    const messageEl = document.createElement('div');
    messageEl.classList.add('message');

    if (sender === 'user') {
        messageEl.classList.add('user-message');
    } else if (sender === 'system') {
        messageEl.classList.add('system-message');
    } else {
        messageEl.classList.add('assistant-message');
    }

    messageEl.textContent = text;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing application...');
    try {
        initializeApp();
    } catch (error) {
        console.error('Error during initialization:', error);
        // Display error to user if needed
        const messages = document.getElementById("chatMessages");
        if (messages) {
            messages.innerHTML = `
                <div class="message system-message">
                    Lo siento, hubo un problema al inicializar la aplicación. 
                    Por favor, recarga la página.
                </div>
            `;
        }
    }
});

// ========================================
// RECEPTIONIST FUNCTIONALITY
// ========================================

// Form and camera variables
let checkinForm = null;
let cameraVideo = null;
let photoCanvas = null;
let photoPreview = null;
let currentStream = null;
let capturedPhotoData = null;
let isFormActive = false; // Flag to track if form is being filled
let summaryElements = {};
let summaryOverlay = null;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize receptionist functionality
function initializeReceptionist() {
    checkinForm = document.getElementById('checkinForm');
    cameraVideo = document.getElementById('cameraVideo');
    photoCanvas = document.getElementById('photoCanvas');
    photoPreview = document.getElementById('photoPreview');
    summaryOverlay = document.getElementById('visitSummaryOverlay');
    
    // Form controls
    const startCameraBtn = document.getElementById('startCamera');
    const takePhotoBtn = document.getElementById('takePhoto');
    const retakePhotoBtn = document.getElementById('retakePhoto');
    const submitFormBtn = document.getElementById('submitForm');
    const cancelFormBtn = document.getElementById('cancelForm');
    const cancelFormSecondaryBtn = document.getElementById('cancelFormSecondary');
    const visitorForm = document.getElementById('visitorForm');
    summaryElements = {};
    document.querySelectorAll('[data-summary]').forEach(el => {
        summaryElements[el.dataset.summary] = el;
    });
    updateVisitSummary();
    
    // Event listeners
    startCameraBtn?.addEventListener('click', startCamera);
    takePhotoBtn?.addEventListener('click', takePhoto);
    retakePhotoBtn?.addEventListener('click', retakePhoto);
    cancelFormBtn?.addEventListener('click', hideCheckinForm);
    cancelFormSecondaryBtn?.addEventListener('click', hideCheckinForm);
    visitorForm?.addEventListener('submit', submitVisitorForm);
    
    // Form validation and summary updates
    visitorForm?.addEventListener('input', () => {
        validateForm();
        updateVisitSummary();
    });
}

function updateVisitSummary() {
    if (!summaryElements || Object.keys(summaryElements).length === 0) {
        return;
    }

    const nameField = document.getElementById('visitorName');
    const companyField = document.getElementById('visitorCompany');
    const reasonField = document.getElementById('visitReason');
    const typeField = document.getElementById('visitorType');

    summaryElements.name && (summaryElements.name.textContent = nameField?.value?.trim() || '—');
    summaryElements.company && (summaryElements.company.textContent = companyField?.value?.trim() || '—');
    summaryElements.reason && (summaryElements.reason.textContent = reasonField?.value ? reasonField.options[reasonField.selectedIndex].text : '—');
    const visitorTypeText = typeField && typeField.selectedIndex >= 0
        ? typeField.options[typeField.selectedIndex].text
        : 'Partner';
    summaryElements.type && (summaryElements.type.textContent = visitorTypeText);
}

async function showVisitSummaryOverlay(data) {
    if (!summaryOverlay) {
        return;
    }

    if (summaryElements && Object.keys(summaryElements).length > 0) {
        summaryElements.name && (summaryElements.name.textContent = data.name || '—');
        summaryElements.company && (summaryElements.company.textContent = data.company || '—');
        const reasonValue = data.reason || '';
        const selectorValue = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(reasonValue) : reasonValue;
        const reasonLabel = document.querySelector(`#visitReason option[value="${selectorValue}"]`)?.textContent || reasonValue || '—';
        summaryElements.reason && (summaryElements.reason.textContent = reasonLabel);
        summaryElements.type && (summaryElements.type.textContent = data.visitorTypeLabel || data.visitorType || 'Partner');
    }

    summaryOverlay.classList.remove('hidden');
    requestAnimationFrame(() => summaryOverlay.classList.add('visible'));
    document.body.classList.add('modal-open');
}

async function hideVisitSummaryOverlay() {
    if (!summaryOverlay || summaryOverlay.classList.contains('hidden')) {
        return;
    }
    summaryOverlay.classList.remove('visible');
    document.body.classList.remove('modal-open');
    await wait(400);
    summaryOverlay.classList.add('hidden');
}

// Show check-in form
function showCheckinForm() {
    if (checkinForm) {
        console.log('Showing check-in form - pausing voice recognition');
        
        // Set form active flag
        isFormActive = true;
        
        // Stop any current voice recognition (text mode keeps this idle, but guard just in case)
        if (recognition && recognition.state !== 'inactive') {
            recognition.stop();
            recognition.abort();
        }
        
        // Clear any pending speech recognition timers
        if (window.noSpeechTimer) {
            clearTimeout(window.noSpeechTimer);
            window.noSpeechTimer = null;
        }
        
        // Remove any listening messages
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            if (msg.textContent.includes("Listening...") || 
                msg.textContent.includes("Waiting for your voice...") ||
                msg.textContent.includes("Esperando tu voz")) {
                msg.remove();
            }
        });
        
        // Show the form
        checkinForm.classList.remove('hidden');
        document.body.classList.add('modal-open');
        
        // Pre-fill name if we have it from conversation
        // Display message to user
        displayMessage("Please complete the visitor registration form. The avatar will resume conversation once you submit the form.", 'system');
        
        validateForm();
    }
}

// Hide check-in form
function hideCheckinForm() {
    if (checkinForm) {
        console.log('Hiding check-in form - resuming voice recognition');
        
        // Hide the form
        checkinForm.classList.add('hidden');
        document.body.classList.remove('modal-open');
        stopCamera();
        resetForm();
        
        // Set form inactive flag
        isFormActive = false;
        
        // Resume voice recognition if in voice mode
        if (voicemodestatus) {
            displayMessage("Form closed. Voice mode is now active again.", 'system');
            setTimeout(() => {
                startRecording();
            }, 1500);
        }
    }
}

// Start camera for photo capture
async function startCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        if (cameraVideo) {
            cameraVideo.srcObject = currentStream;
            
            // Update button visibility
            document.getElementById('startCamera').classList.add('hidden');
            document.getElementById('takePhoto').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Could not access camera. Please check permissions.');
    }
}

// Take photo
function takePhoto() {
    if (!cameraVideo || !photoCanvas) return;
    
    const ctx = photoCanvas.getContext('2d');
    photoCanvas.width = 640;
    photoCanvas.height = 480;
    
    // Draw video frame to canvas
    ctx.drawImage(cameraVideo, 0, 0, 640, 480);
    
    // Get image data
    capturedPhotoData = photoCanvas.toDataURL('image/jpeg', 0.8);
    
    // Show preview
    const capturedPhoto = document.getElementById('capturedPhoto');
    if (capturedPhoto) {
        capturedPhoto.src = capturedPhotoData;
    }
    
    // Update UI
    cameraVideo.style.display = 'none';
    photoPreview?.classList.remove('hidden');
    document.getElementById('takePhoto').classList.add('hidden');
    document.getElementById('retakePhoto').classList.remove('hidden');
    
    stopCamera();
    validateForm();
    updateVisitSummary();
}

// Retake photo
function retakePhoto() {
    // Reset UI
    cameraVideo.style.display = 'block';
    photoPreview?.classList.add('hidden');
    document.getElementById('retakePhoto').classList.add('hidden');
    document.getElementById('startCamera').classList.remove('hidden');
    
    capturedPhotoData = null;
    validateForm();
    updateVisitSummary();
}

// Stop camera
function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

// Validate form
function validateForm() {
    const name = document.getElementById('visitorName')?.value;
    const company = document.getElementById('visitorCompany')?.value;
    const reason = document.getElementById('visitReason')?.value;
    const personToVisit = document.getElementById('personToVisit')?.value;
    
    const isValid = name && company && reason && personToVisit && capturedPhotoData;
    
    const submitBtn = document.getElementById('submitForm');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
    }
}

// Submit visitor form
async function submitVisitorForm(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('visitorName').value,
        company: document.getElementById('visitorCompany').value,
        reason: document.getElementById('visitReason').value,
        visitorType: document.getElementById('visitorType').value,
        personToVisit: document.getElementById('personToVisit').value,
        email: document.getElementById('visitorEmail').value,
        photo: capturedPhotoData,
        timestamp: new Date().toISOString()
    };
    
    try {
        const response = await fetch('/api/register-visitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Form submitted successfully - farewell and scheduled reset');

            // Set form inactive flag
            isFormActive = false;

            // Hide form and reset
            checkinForm.classList.add('hidden');
            document.body.classList.remove('modal-open');
            stopCamera();
            resetForm();

            // Farewell + auto reset
            const farewell = `Thank you ${formData.name}! Your check-in is complete. Welcome to Apeiron Tenerife Center of Excellence. Someone from our team will guide you shortly.`;

            displayMessage(farewell, 'assistant');
            await playAudioResponse(farewell, true);

            const visitorTypeField = document.getElementById('visitorType');
            const visitorTypeLabel = visitorTypeField && visitorTypeField.selectedIndex >= 0
                ? visitorTypeField.options[visitorTypeField.selectedIndex].text
                : 'Partner';

            await wait(2000);
            await showVisitSummaryOverlay({
                ...formData,
                visitorTypeLabel
            });

            await wait(3000);
            await hideVisitSummaryOverlay();
            performFullResetToLanding();

            window.lastVisitorName = null;
            updateVisitSummary();

        } else {
            alert('Error registering visitor: ' + result.message);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error submitting form. Please try again.');
    }
}

// Reset form
function resetForm() {
    const form = document.getElementById('visitorForm');
    if (form) {
        form.reset();
    }
    
    capturedPhotoData = null;
    
    // Reset photo section
    const cameraVideo = document.getElementById('cameraVideo');
    const photoPreview = document.getElementById('photoPreview');
    
    if (cameraVideo) cameraVideo.style.display = 'block';
    if (photoPreview) photoPreview.classList.add('hidden');
    
    document.getElementById('startCamera')?.classList.remove('hidden');
    document.getElementById('takePhoto')?.classList.add('hidden');
    document.getElementById('retakePhoto')?.classList.add('hidden');
    
    validateForm();
    updateVisitSummary();
}

// Enhanced message handling for receptionist
function handleReceptionistResponse(message) {
    // Check if AI wants to show form
    if (message.includes('form') || message.includes('complete') || message.includes('information')) {
        setTimeout(() => {
            showCheckinForm();
        }, 1000);
    }
    
    // Extract name from conversation
    const nameMatch = message.match(/perfect,?\s*([a-z]+)/i);
    if (nameMatch) {
        window.lastVisitorName = nameMatch[1];
    }
}

// Send message to AI without showing it in chat (for internal processes)
async function sendAIMessage(message) {
    try {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        if (data.message) {
            displayMessage(data.message, 'assistant');
        }
    } catch (error) {
        console.error('Error sending AI message:', error);
    }
}

// Reset conversation to start fresh
function resetConversation() {
    // Clear chat messages
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // Send reset message to backend to clear conversation history
    fetch('/api/reset-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(error => {
        console.error('Error resetting conversation:', error);
    });
    
    // Clear any stored visitor name
    window.lastVisitorName = null;
    
    // Start fresh conversation
    setTimeout(() => {
        sendMessageToAI('Hello', true); // Silent greeting to start fresh
    }, 500);
}

// Full reset to landing screen; requires operator pressing Start Check-in again
function performFullResetToLanding() {
    try {
        window.awaitingNextVisitor = false;
        if (window.postRegistrationTimer) {
            clearTimeout(window.postRegistrationTimer);
            window.postRegistrationTimer = null;
        }
        if (summaryOverlay) {
            summaryOverlay.classList.remove('visible');
            summaryOverlay.classList.add('hidden');
        }
        document.body.classList.remove('modal-open');
        if (window.avatarModule && window.avatarModule.isAvailable()) {
            window.avatarModule.close();
        }
        if (audioPlayer) {
            try { audioPlayer.pause(); } catch {}
            audioPlayer = null;
            isAITalking = false;
        }
        const chatMessagesEl = document.getElementById('chatMessages');
        if (chatMessagesEl) chatMessagesEl.innerHTML = '';
        fetch('/api/reset-conversation', { method: 'POST' }).catch(()=>{});
        chatScreen.classList.add('hidden');
        landingScreen.classList.remove('hidden');
        landingScreen.style.opacity = '1';
        chatInitialized = false;
    } catch (e) {
        console.error('Error in performFullResetToLanding:', e);
    }
}
// Initialize receptionist when app loads
document.addEventListener('DOMContentLoaded', function() {
    initializeReceptionist();
});
