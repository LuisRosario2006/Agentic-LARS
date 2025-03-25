// New JavaScript File for AI Agentic Interaction

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const micBtn = document.getElementById('micBtn');
const userInput = document.getElementById('userInput');

// State Variables
let isRecording = false;
let isSpeaking = false;

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

// Toggle Recording (Start/Stop)
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// Start Recording Speech
function startRecording() {
    if (isSpeaking) return; // Do not start recording while speaking
    isRecording = true;
    fetch('/api/speech-to-text', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.text) {
                displayMessage(data.text, 'user');
                sendMessageToAI(data.text);
            }
        })
        .catch(error => console.error('Error in speech-to-text:', error));
}

// Stop Recording
function stopRecording() {
    isRecording = false;
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
    isSpeaking = true;
    updateUIForSpeaking(true);
    fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
    })
    .then(response => response.json())
    .then(() => {
        isSpeaking = false;
        updateUIForSpeaking(false);
        toggleRecording(); // Automatically start listening when done speaking
    })
    .catch(error => console.error('Error in text-to-speech:', error));
}

// Update Mic Button Appearance
function updateMicButton() {
    micBtn.style.backgroundColor = isRecording ? 'red' : 'blue';
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
        updateMicButton(false);
        
    } else {
        toggleRecording();
        updateMicButton(speaking);
        micBtn.disabled = false;
        micBtn.style.opacity = 1;
    }
}
// Event Listener for Mic Button
micBtn.addEventListener('click', toggleRecording);

// Start the Conversation Automatically
startConversation();
