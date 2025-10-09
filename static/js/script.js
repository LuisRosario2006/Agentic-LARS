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
            displayMessage("Tu navegador no soporta el acceso al micrófono. Cambiando a modo texto.", 'system');
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
            displayMessage("No se pudo acceder al micrófono. Cambiando a modo texto.", 'system');
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
                    displayMessage("Esperando tu voz...", 'system');
                } else {
                    displayMessage("Hubo un problema con el reconocimiento de voz. ¿Podrías intentar de nuevo?", 'system');
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
            displayMessage("Tu navegador no soporta el reconocimiento de voz. Cambiando a modo texto.", 'system');
            voicemodestatus = false;
            modeToggleBtn.classList.add("toggled");
            modeLabel.textContent = "Text Mode";
            inputSection.classList.remove("hidden");
            return false;
        }
    } catch (error) {
        console.error("Error initializing speech recognition:", error);
        displayMessage("Hubo un problema al inicializar el reconocimiento de voz. Cambiando a modo texto.", 'system');
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
            displayMessage("Lo siento, hubo un problema al iniciar la conversación. Por favor, recarga la página.", 'system');
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
function playAudioResponse(message, skipDisplay = false) {
    if (!message) {
        console.error('No message to play');
        return;
    }

    // Display the message only if skipDisplay is false
    if (!skipDisplay) {
        displayMessage(message, 'assistant');
    }

    console.log('Requesting text-to-speech for message:', message);
    showTypingIndicator("assistant");
  
    fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message })
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
                    displayMessage("Haz clic en cualquier parte para activar el audio", 'system');
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
            if (voicemodestatus) {
                console.log("Starting recording after audio");
                setTimeout(startRecording, 1000);
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
            if (voicemodestatus) {
                setTimeout(startRecording, 1000);
            }
        };
    })
    .catch(error => {
        console.error('Error in text-to-speech:', error);
        hideTypingIndicator();
        displayMessage("Lo siento, hubo un problema generando el audio.", 'assistant');
        if (voicemodestatus) {
            setTimeout(startRecording, 1000);
        }
    });
}  

// 🔹 Function: Display Messages in the chat
function displayMessage(content, role = "assistant") {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${role}-message`);
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
        displayMessage("Modo de texto activado. Escribe tu mensaje y presiona enviar.", 'system');
        userInput?.focus();
    } else {
        displayMessage("Modo de voz activado. Puedes hablar cuando veas el icono del micrófono.", 'system');
        setTimeout(startRecording, 1000);
    }
}

// 🔹 Start Recording Speech
function startRecording() {
    if (!voicemodestatus) {
        console.log('Voice mode is disabled, not starting recording');
        return;
    }

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
        displayMessage("Escuchando...", 'system');
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
        // Remove the "Escuchando..." message
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
            displayMessage("Hubo un problema con el reconocimiento de voz. ¿Podrías intentar de nuevo?", 'system');
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
                    msg.textContent.includes("Escuchando...")) {
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
                displayMessage("Esperando tu voz...", 'system');
            }
        }
    })
    .catch(error => {
        console.error('Error in speech-to-text:', error);
        hideTypingIndicator();
        // Remove the "Escuchando..." message if it exists
        if (chatMessages.lastChild && chatMessages.lastChild.textContent === "Escuchando...") {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        displayMessage("Lo siento, hubo un problema al escucharte. ¿Podrías intentarlo de nuevo?", 'assistant');
        setTimeout(startRecording, 2000);
    });
}
// 🔹 Send Message to AI and Handle Response
function sendMessageToAI(text) {
    // Show user message first
    displayMessage(text, 'user');

        // Check if AI is talking and handle interruption
    if (isAITalking && audioPlayer) {
        console.log('Interrupting AI speech...');
        audioPlayer.pause();
        URL.revokeObjectURL(audioPlayer.src);
        audioPlayer = null;
        isAITalking = false;
        
        // Append interruption acknowledgment to the user's message
        text = "Me disculpo por la interrupción. " + text;
    }

    // Send to backend
    fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    })
    .then(response => response.json())
    .then(data => {
        playAudioResponse(data.message);
    })
    .catch(error => console.error('Error sending message:', error));
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
