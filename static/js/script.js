document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const micBtn = document.getElementById('micBtn');
    const resetBtn = document.getElementById('resetBtn');
    const muteBtn = document.getElementById('muteBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const speechOutput = document.getElementById('speechOutput');
    
    // State variables
    let isRecording = false;
    let isMuted = false;
    let recognition = null;
    
    // Initialize speech recognition if supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            stopRecording();
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            stopRecording();
        };
        
        recognition.onend = function() {
            stopRecording();
        };
    } else {
        micBtn.disabled = true;
        micBtn.title = 'Speech recognition not supported in this browser';
    }
    
    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    micBtn.addEventListener('click', toggleRecording);
    resetBtn.addEventListener('click', resetConversation);
    muteBtn.addEventListener('click', toggleMute);
    
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
    });
    
    // Initialize conversation
    startConversation();
    
    // Functions
    function startConversation() {
        showTypingIndicator();
        
        fetch('/api/start-conversation')
            .then(response => response.json())
            .then(data => {
                hideTypingIndicator();
                addMessage(data.message, 'assistant');
                speakText(data.message);
            })
            .catch(error => {
                console.error('Error starting conversation:', error);
                hideTypingIndicator();
            });
    }
    
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessage(message, 'user');
        
        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to server
        fetch('/api/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            hideTypingIndicator();
            addMessage(data.message, 'assistant');
            speakText(data.message);
        })
        .catch(error => {
            console.error('Error sending message:', error);
            hideTypingIndicator();
            addMessage('Sorry, there was an error processing your message.', 'assistant');
        });
    }
    
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    function startRecording() {
        if (!recognition) return;
        
        isRecording = true;
        micBtn.classList.add('recording');
        micBtn.title = 'Stop recording';
        
        try {
            recognition.start();
        } catch (e) {
            console.error('Error starting recognition:', e);
        }
    }
    
    function stopRecording() {
        if (!recognition) return;
        
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.title = 'Start recording';
        
        try {
            recognition.stop();
        } catch (e) {
            console.error('Error stopping recognition:', e);
        }
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
    
    function toggleMute() {
        isMuted = !isMuted;
        
        if (isMuted) {
            muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            muteBtn.title = 'Unmute';
            muteBtn.classList.add('muted');
        } else {
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            muteBtn.title = 'Mute';
            muteBtn.classList.remove('muted');
        }
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
    
    function showTypingIndicator() {
        typingIndicator.style.display = 'block';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
    }
    
    function speakText(text) {
        if (isMuted) return;
        
        // In a real implementation, this would use the Text-to-Speech API
        // Here's a simplified version that would work if the API returns audio URLs
        fetch('/api/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        })
        .then(response => response.json())
        .then(data => {
            // In a real implementation with audio URL:
            // speechOutput.src = data.audioUrl;
            // speechOutput.play();
            console.log('Text-to-speech processed');
        })
        .catch(error => {
            console.error('Error in text-to-speech:', error);
        });
    }
});