from flask import Flask, render_template, request, jsonify
import os

print("Starting app.py - imports successful")

app = Flask(__name__)
print("Flask app instance created")

# Try to import AI engine, but handle failure gracefully
try:
    import ai_engine
    ai_engine_available = True
    # Initialize AI engine
    ai_engine.initialize()
    print("AI engine imported and initialized successfully")
except ImportError as e:
    print(f"Warning: Could not import ai_engine: {e}")
    ai_engine_available = False
except Exception as e:
    print(f"Error initializing ai_engine: {e}")
    ai_engine_available = False

@app.route('/')
def index():
    """Render the main chat interface"""
    print("Route '/' requested")
    return render_template('index.html')

@app.route('/api/start-conversation', methods=['GET'])
def start_conversation():
    """Start the conversation with the AI's initial message"""
    print("Route '/api/start-conversation' requested")
    if ai_engine_available:
        initial_message = ai_engine.get_initial_message()
    else:
        initial_message = "Hey! I see you're looking to optimize IT strategy. Have you considered a Solution Assessment?"
    return jsonify({
        'message': initial_message,
        'role': 'assistant'
    })

@app.route('/api/send-message', methods=['POST'])
def send_message():
    """Process a text message from the user"""
    print("Route '/api/send-message' requested")
    user_message = request.json.get('message', '')
    if not user_message:
        return jsonify({'error': 'No message provided'}), 400
    
    # Get AI response
    if ai_engine_available:
        ai_response = ai_engine.get_gpt_response(user_message)
    else:
        ai_response = "I'm in demo mode right now. In full operation, I would analyze your message and provide a tailored response."
    
    return jsonify({
        'message': ai_response,
        'role': 'assistant'
    })

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    """Convert speech to text using Azure"""
    print("Route '/api/speech-to-text' requested")
    if ai_engine_available:
        text = ai_engine.speech_to_text()
    else:
        text = "Speech recognition is not available in demo mode."
    return jsonify({'text': text})

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech and return audio URL or data"""
    print("Route '/api/text-to-speech' requested")
    text = request.json.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    # In a real implementation, this would generate audio and return a URL
    if ai_engine_available:
        ai_engine.synthesize_speech(text)
    
    return jsonify({'success': True})

@app.route('/api/reset-conversation', methods=['POST'])
def reset_conversation():
    """Reset the conversation to its initial state"""
    print("Route '/api/reset-conversation' requested")
    try:
        if ai_engine_available:
            ai_engine.reset_conversation()
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error resetting conversation: {e}")
        return jsonify({'error': str(e)}), 500

# Error handling routes
@app.errorhandler(404)
def not_found(e):
    print(f"404 error: {e}")
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(e):
    print(f"500 error: {e}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Running Flask app...")
    # Use environment variables for production settings
    port = int(os.environ.get('PORT', 5000))
    try:
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        print(f"Error running Flask app: {e}")
    print("Flask app finished.")  # This line won't execute until you stop the server