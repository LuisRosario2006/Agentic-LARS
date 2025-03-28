// New JavaScript File for AI Agentic Interaction

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const micBtn = document.getElementById('micBtn');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');
const muteBtn = document.getElementById('muteBtn');


let isMuted = false;
let audioPlayer = null


// Start Application by Fetching Initial Message
function startConversation() {
    fetch('/api/start-conversation')
        .then(response => response.json())
        .then(data => {
            displayMessage(data.message, 'assistant');
            playAudioResponse(data.message);
        })
        .catch(error => console.error('Error starting conversation:', error));
}

// Start Recording Speech
function startRecording() {
    fetch('/api/speech-to-text', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.text) {
                displayMessage(data.text, 'user');
                sendMessageToAI(data.text);
            } else {
                handleUnrecognizedSpeech();  // Call the new function if speech is not recognized
            }
        })
        .catch(error => console.error('Error in speech-to-text:', error));
}

function sendMessage() {
    console.log("Sending message a: ");
    const message = userInput.value.trim();
    if (!message) return;
    console.log("Sending message: ", message);
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Show typing indicator
    showTypingIndicator();

    sendMessageToAI(message);
}
function showTypingIndicator() {
    typingIndicator.style.display = 'block';
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(role + '-message');
    
    // Process markdown-like formatting in the message
    const formattedContent = formatMessage(content);
    messageDiv.innerHTML = formattedContent;
    
    // Add timestamp
    const timeSpan = document.createElement('div');
    timeSpan.classList.add('message-time');
    const now = new Date();
    timeSpan.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.appendChild(timeSpan);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function formatMessage(text) {
    // Simple markdown-like formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// Send Text to AI Model
function sendMessageToAI(text) {
    fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    })
    .then(response => response.json())
    .then(data => {
        displayMessage(data.message, 'assistant');
        playAudioResponse(data.message);
    })
    .catch(error => console.error('Error sending message:', error));
}

// Play Audio Response (Text-to-Speech)
function playAudioResponse(text) {
    if (!text) return;
    updateUIForSpeaking(true);
    fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
    })
    .then(response => response.blob())
    .then(audioBlob => {
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        
        audioPlayer = new Audio(audioUrl);
        
        // Apply mute state if needed
        audioPlayer.volume = isMuted ? 0 : 1;

        audioPlayer.play()
            .then(() => console.log("Audio is playing successfully."))
            .catch(error => console.error("Audio playback error: ", error));

        audioPlayer.onended = () => {
            console.log("Audio finished playing.");
            updateUIForSpeaking(false);
            if(!isMuted)
                startRecording(); // Automatically starts listening again if needed
        };
    })
    .catch(error => console.error('Error in text-to-speech:', error));
}
// Update Mic Button Appearance
function updateMicButton(speaking) {
    micBtn.style.backgroundColor = speaking ? 'blue' : 'red';
}
function resetConversation() {
    // Clear chat messages
    chatMessages.innerHTML = '';
   
    // Reset on server
    fetch('/api/reset-conversation', { method: 'POST' })
        .then(() => {
            // Start new conversation
            startConversation();
        })
        .catch(error => {
            console.error('Error resetting conversation:', error);
            addMessage('Failed to reset conversation. Please reload the page.', 'assistant');
        });
}

function handleUnrecognizedSpeech() {
    const apologyMessage = "Hey, sorry, I couldn't catch that. Could you try again?";
    displayMessage(apologyMessage, 'assistant');
    playAudioResponse(apologyMessage);  // Optional: If you want it to speak the message.
}

// Display Message on Screen
function displayMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role + '-message');
    messageDiv.innerText = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateUIForSpeaking(speaking) {
     if (speaking) {
        micBtn.disabled = true;
        micBtn.style.opacity = 0.5;
        micBtn.style.backgroundColor = speaking ? 'blue' : 'red';
        
    } else {
        micBtn.style.backgroundColor = speaking ? 'blue' : 'red';
        micBtn.disabled = false;
        micBtn.style.opacity = 1;
    }
}
//Listeners
    resetBtn.addEventListener('click', resetConversation);
    muteBtn.addEventListener('click', toggleMute);
    startBtn.addEventListener('click', startConversation);
    sendBtn.addEventListener('click', sendMessage);

    
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
       
        // Auto-resize the textarea
        setTimeout(() => {
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
        }, 0);
    })
//Toogle Mute to disable sound on the browser
    function toggleMute() {
        isMuted = !isMuted;
    
        if (isMuted) {
            muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            muteBtn.title = 'Unmute';
            muteBtn.classList.add('muted');
            
            if (audioPlayer) {
                audioPlayer.volume = 0;  // Mute the audio by setting volume to 0
            }
        } else {
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            muteBtn.title = 'Mute';
            muteBtn.classList.remove('muted');
            
            if (audioPlayer) {
                audioPlayer.volume = 1;  // Unmute by setting volume to maximum
            }
        }
    }
