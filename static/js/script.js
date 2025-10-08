// 🔹 DOM Elements
const modeToggleBtn = document.getElementById("modeToggleBtn");
const modeLabel = document.getElementById("modeLabel");
const modeIcon = document.getElementById("modeIcon");
const inputSection = document.getElementById("textInputSection");
const sendBtn = document.getElementById("sendBtn");
const statusSection = document.getElementById("voiceStatus");
const userInput = document.getElementById("userInput");
const typingIndicator = document.getElementById("typingIndicator");

const chatMessages = document.getElementById("chatMessages");

const startChatBtn = document.querySelector(".start-chat-btn");
const landingScreen = document.getElementById("landingScreen");
const chatScreen = document.getElementById("chatScreen");

let voicemodestatus = true;
let audioPlayer = null;
let isMuted = false;


// 🔹 Function: Start Chat on Voice Mode
function showChatScreen() {
    landingScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    startConversation(); // Fetch initial message from server
  }

// 🔹 Function: Toggle Mode
function toggleMode() {
  const isTextMode = modeToggleBtn.classList.toggle("toggled");
  voicemodestatus = !isTextMode;

  modeLabel.textContent = isTextMode ? "Text Mode" : "Voice Mode";
  modeIcon.innerHTML = "";
  const iconSvg = createModeIcon(isTextMode);
  modeIcon.appendChild(iconSvg);

  inputSection.classList.toggle("hidden", !isTextMode);
  sendBtn.classList.toggle("hidden", !isTextMode);
  statusSection.classList.toggle("hidden", isTextMode);
}


// Start Application by Fetching Initial Message
function startConversation() {
    fetch('/api/start-conversation')
        .then(response => response.json())
        .then(data => {
            playAudioResponse(data.message);
        })
        .catch(error => console.error('Error starting conversation:', error));
}

// Play Audio Response (Text-to-Speech)
function playAudioResponse(message) {
    showTypingIndicator("assistant");
  
    fetch('/api/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    })
    .then(response => response.blob())
    .then(audioBlob => {
      hideTypingIndicator();
  
      const audioUrl = URL.createObjectURL(audioBlob);
  
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      }
  
      audioPlayer = new Audio(audioUrl);
      audioPlayer.volume = isMuted ? 0 : 1;
  
      audioPlayer.play()
        .then(() => {
          console.log("Audio is playing successfully.");
          displayMessage(message, 'assistant');
        })
        .catch(error => console.error("Audio playback error: ", error));
  
      audioPlayer.onended = () => {
        console.log("Audio finished playing.");
        startRecording();
      };
    })
    .catch(error => {
      hideTypingIndicator();
      console.error('Error in text-to-speech:', error);
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

// 🔹 Start Recording Speech
function startRecording() {
    showTypingIndicator("user");
    fetch('/api/speech-to-text', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.text) {
                displayMessage(data.text, 'user');
                sendMessageToAI(data.text);
                showTypingIndicator();
            } else {
                handleUnrecognizedSpeech();  // Call the new function if speech is not recognized
            }
        })
        .catch(error => console.error('Error in speech-to-text:', error));
}
// 🔹 Send Audio to Model
function sendMessageToAI(text) {
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

// 🔹 EVENT LISTENERS (CLEANLY AT THE END)
modeToggleBtn.addEventListener("click", toggleMode);
userInput.addEventListener("input", handleInputChange);
startChatBtn.addEventListener("click", showChatScreen);
