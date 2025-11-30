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

// 🔹 Global Variables
let voicemodestatus = true;
let audioPlayer = null;
let isMuted = false;
let isAITalking = false;

// Initialize all DOM elements and event listeners
function initializeApp() {
    console.log('Initializing application...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Initialize Voice Recognition
    initializeVoiceRecognition();
    
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
        startChatBtn.addEventListener('click', () => {
            console.log('Start chat button clicked');
            showChatScreen().catch(error => {
                console.error('Error showing chat screen:', error);
                displayMessage(error.message, 'system');
            });
        });
    }
    
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
    console.log("Starting conversation...");
    return fetch('/api/start-conversation')
        .then(response => response.json())
        .then(data => {
            console.log("Got initial message:", data.message);
            // First display the message
            displayMessage(data.message, 'assistant');
            
            // Play audio response immediately regardless of voice mode
            // Pass true to skip displaying the message again
            playAudioResponse(data.message, true);
        })
        .catch(error => {
            console.error('Error starting conversation:', error);
            displayMessage("Sorry, there was a problem starting the conversation. Please refresh the page.", 'system');
        });
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

        // Start the conversation immediately
        await startConversation();
        
        // Set up UI for voice mode
        modeToggleBtn.classList.toggle("toggled", !voicemodestatus);
        modeLabel.textContent = "Voice Mode";
        modeIcon.innerHTML = "";
        const iconSvg = createModeIcon(false);
        modeIcon.appendChild(iconSvg);
        
        // Hide text input in voice mode
        inputSection.classList.toggle("hidden", voicemodestatus);
        
        console.log('Chat screen initialized successfully');
        
    } catch (error) {
        console.error('Error in showChatScreen:', error);
        throw new Error('No se pudo iniciar el chat. Por favor, recarga la página.');
    }
}

// Play Audio Response (Text-to-Speech)
async function playAudioResponse(message, skipDisplay = false, wasInterrupted = false) {
    console.log('playAudioResponse called, wasInterrupted:', wasInterrupted, 'voicemodestatus:', voicemodestatus);
    
    if (!message) {
        console.error('No message to play');
        // Force restart recording if needed
        if (voicemodestatus) {
            console.log('No message, restarting recording...');
            setTimeout(startRecording, 1000);
        }
        return;
    }

    // Display the message only if skipDisplay is false
    if (!skipDisplay) {
        displayMessage(message, 'assistant');
        
        // Handle receptionist responses
        handleReceptionistResponse(message);
    }

    // Clean message for TTS (remove script tags)
    const cleanMessage = message.replace(/<script>.*?<\/script>/g, '').trim();
    if (!cleanMessage) {
        console.log('No text content to speak after removing scripts, restarting recording...');
        if (voicemodestatus) {
            setTimeout(startRecording, 1000);
        }
        return;
    }

    console.log('Requesting text-to-speech for message:', cleanMessage);
    showTypingIndicator("assistant");

    // Try to use avatar if available
    if (window.avatarModule && window.avatarModule.isAvailable()) {
        console.log('Using avatar for speech synthesis, wasInterrupted:', wasInterrupted);
        try {
            // If we were interrupted, give a bit more time for cleanup
            const delay = wasInterrupted ? 300 : 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            const success = await window.avatarModule.speak(cleanMessage);
            hideTypingIndicator();
            
            if (success) {
                console.log('Avatar speech completed successfully, voicemodestatus:', voicemodestatus, 'isFormActive:', isFormActive);
                // Always restart recording after avatar speech if in voice mode and form is not active
                if (voicemodestatus && !isFormActive) {
                    console.log('Scheduling recording restart after avatar speech');
                    setTimeout(() => {
                        console.log('Executing scheduled recording restart...');
                        startRecording();
                    }, 1000);
                } else if (isFormActive) {
                    console.log('Form is active, not restarting recording after avatar speech');
                }
                return;
            } else {
                console.log('Avatar speech failed, falling back to standard TTS');
            }
        } catch (error) {
            console.error('Avatar speech error, falling back to standard TTS:', error);
        }
    }

    // Fallback to standard TTS if avatar is not available or failed
    fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanMessage })
    })
    .then(response => {
        console.log('TTS response status:', response.status);
        console.log('TTS response headers:', response.headers);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
    })
    .then(audioBlob => {
        console.log('Received audio blob:', audioBlob.type, audioBlob.size, 'bytes');
        hideTypingIndicator();
  
        // Create audio URL
        const audioUrl = URL.createObjectURL(audioBlob);
  
        // Clean up old audio player if it exists
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.remove();
            URL.revokeObjectURL(audioPlayer.src);
        }
  
        // Create new audio player
        audioPlayer = new Audio(audioUrl);
        audioPlayer.volume = isMuted ? 0 : 1;
        isAITalking = true; // Set flag when starting playback
        
        console.log('Created new audio player');
        
        // Play audio when ready
        audioPlayer.oncanplaythrough = () => {
            console.log('Audio can play through, attempting to play...');
            audioPlayer.play()
                .then(() => {
                    console.log("Audio playing successfully");
                    // Detenemos cualquier reconocimiento de voz activo mientras reproducimos
                    if (recognition) {
                        recognition.abort();
                    }
                })
                .catch(error => {
                    console.error("Error playing audio:", error);
                    isAITalking = false; // Reset flag on error
                    // Intentar reproducir nuevamente después de una interacción del usuario
                    displayMessage("Click anywhere to activate audio", 'system');
                    document.body.addEventListener('click', function playAudioOnce() {
                        audioPlayer.play().catch(console.error);
                        document.body.removeEventListener('click', playAudioOnce);
                    });
                });
        };
  
        // Handle audio completion
        audioPlayer.onended = () => {
            console.log("Audio finished playing");
            URL.revokeObjectURL(audioUrl);
            isAITalking = false; // Reset flag when finished playing
            if (voicemodestatus && !isFormActive) {
                console.log("Starting recording after audio completion");
                setTimeout(() => {
                    console.log("Attempting to restart recording...");
                    startRecording();
                }, 1000);
            } else if (isFormActive) {
                console.log("Form is active, not restarting recording after audio");
            }
        };
        
        // Add progress monitoring
        audioPlayer.ontimeupdate = () => {
            console.log(`Audio playback progress: ${audioPlayer.currentTime}/${audioPlayer.duration} seconds`);
        };
        
        // Handle audio errors
        audioPlayer.onerror = () => {
            console.error("Audio error");
            URL.revokeObjectURL(audioUrl);
            isAITalking = false; // Reset flag on error
            if (voicemodestatus && !isFormActive) {
                console.log('Audio error, restarting recording...');
                setTimeout(startRecording, 1000);
            } else if (isFormActive) {
                console.log('Audio error but form is active, not restarting recording');
            }
        };
        
        // Add a timeout fallback to ensure recording always restarts
        const audioTimeout = setTimeout(() => {
            console.log('Audio timeout fallback triggered');
            if (voicemodestatus && !isAITalking && !isFormActive) {
                console.log('Fallback: restarting recording due to timeout');
                startRecording();
            } else if (isFormActive) {
                console.log('Timeout fallback but form is active, not restarting recording');
            }
        }, 30000); // 30 second fallback
        
        // Clear timeout when audio ends normally
        const originalOnended = audioPlayer.onended;
        audioPlayer.onended = () => {
            clearTimeout(audioTimeout);
            originalOnended();
        };
    })
    .catch(error => {
        console.error('Error in text-to-speech:', error);
        hideTypingIndicator();
        displayMessage("Lo siento, hubo un problema generando el audio.", 'assistant');
        if (voicemodestatus && !isFormActive) {
            console.log('TTS error, forcing recording restart...');
            setTimeout(() => {
                console.log('Executing TTS error recovery...');
                startRecording();
            }, 1000);
        } else if (isFormActive) {
            console.log('TTS error but form is active, not restarting recording');
        }
    });
}  

// 🔹 Function: Display Messages in the chat
function displayMessage(content, role = "assistant") {
    // Check for script tags in the content
    const scriptRegex = /<script>(.*?)<\/script>/g;
    let scriptFound = false;
    let cleanContent = content;
    
    // Extract and execute any scripts
    let match;
    while ((match = scriptRegex.exec(content)) !== null) {
        scriptFound = true;
        const scriptContent = match[1];
        cleanContent = content.replace(match[0], '').trim();
        
        try {
            // Execute the script
            console.log('Executing script:', scriptContent);
            eval(scriptContent);
        } catch (error) {
            console.error('Error executing script:', error);
        }
    }
    
    // Only display the message if there's content after removing scripts
    if (cleanContent && cleanContent.trim()) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", `${role}-message`);
        messageDiv.textContent = cleanContent;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 🔹 Toggle Voice/Text Mode
async function toggleMode() {
    // Clear any pending speech recognition timers
    if (window.noSpeechTimer) {
        clearTimeout(window.noSpeechTimer);
        window.noSpeechTimer = null;
    }

    // If there's a "Esperando tu voz..." message, remove it
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
        if (msg.textContent.includes("Esperando tu voz") || 
            msg.textContent.includes("Parece que no estás hablando")) {
            msg.remove();
        }
    });

    // Update mode state
    voicemodestatus = !voicemodestatus;
    const isTextMode = !voicemodestatus;

    // If switching to text mode, stop any ongoing recognition
    if (isTextMode && recognition) {
        recognition.stop();
    }

    // Update UI elements
    modeToggleBtn.classList.toggle("toggled", isTextMode);
    modeLabel.textContent = isTextMode ? "Text Mode" : "Voice Mode";
    modeIcon.innerHTML = "";
    const iconSvg = createModeIcon(isTextMode);
    modeIcon.appendChild(iconSvg);

    // Show/hide appropriate input sections
    inputSection.classList.toggle("hidden", !isTextMode);
    sendBtn.classList.toggle("hidden", !isTextMode);

    // Show mode change message and set focus
    if (isTextMode) {
        displayMessage("Text mode activated. Type your message and press send.", 'system');
        userInput?.focus();
    } else {
        displayMessage("Voice mode activated. You can speak when you see the microphone icon.", 'system');
        setTimeout(startRecording, 1000);
    }
}

// 🔹 Start Recording Speech
function startRecording() {
    console.log('startRecording called, voicemodestatus:', voicemodestatus, 'isFormActive:', isFormActive);
    if (!voicemodestatus) {
        console.log('Voice mode is disabled, not starting recording');
        return;
    }
    
    // Don't start recording if form is active
    if (isFormActive) {
        console.log('Form is active, not starting voice recording');
        return;
    }
    
    console.log('Starting recording process...');

    // Limpiar cualquier temporizador existente
    if (window.noSpeechTimer) {
        clearTimeout(window.noSpeechTimer);
        window.noSpeechTimer = null;
    }

    // Remover mensajes de espera anteriores
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
        if (msg.textContent.includes("Esperando tu voz") || 
            msg.textContent.includes("Escuchando...")) {
            msg.remove();
        }
    });

    console.log('Starting speech recognition...');
    showTypingIndicator("user");
    
    // Display visual feedback that we're listening
    if (voicemodestatus) {
        displayMessage("Listening...", 'system');
    }

    fetch('/api/speech-to-text', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        console.log('Speech-to-text response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        hideTypingIndicator();
        // Remove the "Listening..." message
        chatMessages.removeChild(chatMessages.lastChild);

        if (data.error) {
            throw new Error(data.error);
        }

        if (data.text && data.text.trim()) {
            console.log("Speech recognized:", data.text);
            displayMessage(data.text, 'user');
            sendMessageToAI(data.text);
        } else if (data.error) {
            console.error("Speech error:", data.error);
            displayMessage("There was a problem with speech recognition. Could you try again?", 'system');
            setTimeout(startRecording, 2000);
        } else {
            console.log("No speech detected");
            // Limpiar cualquier temporizador existente
            if (window.noSpeechTimer) {
                clearTimeout(window.noSpeechTimer);
            }
            
            // Remover mensajes de espera anteriores
            const messages = document.querySelectorAll('.message');
            messages.forEach(msg => {
                if (msg.textContent.includes("Esperando tu voz") || 
                    msg.textContent.includes("Listening...")) {
                    msg.remove();
                }
            });
            
            if (voicemodestatus) {  // Solo si estamos en modo voz
                // Esperar 20 segundos antes de mostrar el mensaje
                window.noSpeechTimer = setTimeout(() => {
                    if (voicemodestatus) {  // Verificar de nuevo que seguimos en modo voz
                        displayMessage("Parece que no estás hablando. ¿Hay algo en lo que pueda ayudarte? Puedes intentar hablar de nuevo o usar el modo texto si lo prefieres.", 'system');
                        setTimeout(startRecording, 2000);
                    }
                }, 20000);
                
                // Mostrar mensaje de espera
                displayMessage("Waiting for your voice...", 'system');
            }
        }
    })
    .catch(error => {
        console.error('Error in speech-to-text:', error);
        hideTypingIndicator();
        // Remove the "Listening..." message if it exists
        if (chatMessages.lastChild && chatMessages.lastChild.textContent === "Listening...") {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        displayMessage("Lo siento, hubo un problema al escucharte. ¿Podrías intentarlo de nuevo?", 'assistant');
        setTimeout(startRecording, 2000);
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

// Initialize receptionist functionality
function initializeReceptionist() {
    checkinForm = document.getElementById('checkinForm');
    cameraVideo = document.getElementById('cameraVideo');
    photoCanvas = document.getElementById('photoCanvas');
    photoPreview = document.getElementById('photoPreview');
    
    // Form controls
    const startCameraBtn = document.getElementById('startCamera');
    const takePhotoBtn = document.getElementById('takePhoto');
    const retakePhotoBtn = document.getElementById('retakePhoto');
    const submitFormBtn = document.getElementById('submitForm');
    const cancelFormBtn = document.getElementById('cancelForm');
    const visitorForm = document.getElementById('visitorForm');
    
    // Event listeners
    startCameraBtn?.addEventListener('click', startCamera);
    takePhotoBtn?.addEventListener('click', takePhoto);
    retakePhotoBtn?.addEventListener('click', retakePhoto);
    cancelFormBtn?.addEventListener('click', hideCheckinForm);
    visitorForm?.addEventListener('submit', submitVisitorForm);
    
    // Form validation
    visitorForm?.addEventListener('input', validateForm);
}

// Show check-in form
function showCheckinForm() {
    if (checkinForm) {
        console.log('Showing check-in form - pausing voice recognition');
        
        // Set form active flag
        isFormActive = true;
        
        // Stop any current voice recognition
        if (recognition && recognition.state !== 'inactive') {
            recognition.stop();
            recognition.abort();
        }
        
        // Stop any current AI speech
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            isAITalking = false;
        }
        
        // Stop avatar speech if active
        if (window.avatarModule && window.avatarModule.isAvailable()) {
            window.avatarModule.stopSpeaking();
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
        
        // Pre-fill name if we have it from conversation
        const nameField = document.getElementById('visitorName');
        if (nameField && window.lastVisitorName) {
            nameField.value = window.lastVisitorName;
        }
        
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
            console.log('Form submitted successfully - resuming conversation');
            
            // Set form inactive flag
            isFormActive = false;
            
            // Hide form and reset
            checkinForm.classList.add('hidden');
            stopCamera();
            resetForm();
            
            // Show success message and resume conversation
            displayMessage(`Thank you ${formData.name}! Your registration has been completed successfully. How else can I assist you today?`, 'assistant');
            
            // Play the success message with avatar/TTS
            playAudioResponse(`Thank you ${formData.name}! Your registration has been completed successfully. How else can I assist you today?`, true);
            
            // Clear any stored visitor name
            window.lastVisitorName = null;
            
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

// Initialize receptionist when app loads
document.addEventListener('DOMContentLoaded', function() {
    initializeReceptionist();
});
