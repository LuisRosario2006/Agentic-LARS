from flask import Flask, render_template, request, jsonify, send_file
import os
import io

app = Flask(__name__)

# Initialize AI engine
try:
    import ai_engine
    ai_engine_available = True
except Exception as e:
    print(f"Error initializing AI engine: {e}")
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
    try:
        if ai_engine_available:
            initial_message = ai_engine.get_initial_message()
        else:
            initial_message = "I'm currently in limited mode. Please ensure the AI engine is properly configured."
        
        return jsonify({
            'message': initial_message,
            'role': 'assistant'
        })
    except Exception as e:
        print(f"Error in start_conversation: {e}")
        return jsonify({'error': 'Failed to start conversation', 'details': str(e)}), 500

@app.route('/api/send-message', methods=['POST'])
def send_message():
    """Process a text message from the user"""
    print("Route '/api/send-message' requested")
    
    try:
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
        })
    except Exception as e:
        print(f"Error in send_message: {e}")
        return jsonify({'error': 'Failed to process message', 'details': str(e)}), 500

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    """Convert speech to text using Azure"""
    print("Route '/api/speech-to-text' requested")
    
    try:
        if ai_engine_available:
            try:
                print("Attempting to start speech recognition...")
                text = ai_engine.speech_to_text()
                if text:
                    print(f"Speech recognition successful: {text}")
                    return jsonify({'text': text})
                else:
                    print("No text was recognized")
                    return jsonify({'text': '', 'message': 'No speech detected'})
            except Exception as e:
                print(f"Error in speech recognition: {e}")
                return jsonify({'error': 'Speech recognition failed', 'details': str(e)}), 500
        else:
            print("AI engine not available")
            return jsonify({'error': 'Speech recognition is not available in demo mode'}), 503
    except Exception as e:
        print(f"Unexpected error in speech_to_text route: {e}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech and return audio stream"""
    print("\n=== Text-to-Speech Request ===")
    
    try:
        text = request.json.get('text', '')
        print(f"Full text received: {text}")
        
        if not text:
            print("Error: No text provided")
            return jsonify({'error': 'No text provided'}), 400

        if not ai_engine_available:
            print("Error: Speech synthesis not available - AI engine not loaded")
            return jsonify({'error': 'Speech synthesis not available'}), 503

        try:
            print("Calling synthesize_speech...")
            audio_stream = ai_engine.synthesize_speech(text)
            
            if audio_stream and isinstance(audio_stream, io.BytesIO):
                print("Audio stream generated successfully")
                # Get stream size for debugging
                stream_size = audio_stream.getbuffer().nbytes
                print(f"Audio stream size: {stream_size} bytes")
                
                response = send_file(
                    audio_stream,
                    mimetype='audio/mpeg',
                    as_attachment=True,
                    download_name='speech.mp3'
                )
                # Ensure proper headers for audio streaming
                response.headers['Accept-Ranges'] = 'bytes'
                return response
            else:
                print("Speech synthesis disabled - running in demo mode")
                return jsonify({'message': 'Speech synthesis running in demo mode', 'demo': True}), 200
        except Exception as e:
            print(f"Speech synthesis disabled: {e}")
            return jsonify({'message': 'Speech synthesis running in demo mode', 'demo': True}), 200
    except Exception as e:
        print(f"Unexpected error in text_to_speech route: {e}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/reset-conversation', methods=['POST'])
def reset_conversation():
    """Reset the conversation to its initial state"""
    print("Route '/api/reset-conversation' requested")
    try:
        if ai_engine_available:
            ai_engine.reset_conversation()
            print(f"Reset Conversation Succes:")
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error resetting conversation: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/avatar/ice-token', methods=['GET'])
def get_avatar_ice_token():
    """Get ICE server token for avatar WebRTC connection"""
    print("Route '/api/avatar/ice-token' requested")
    
    try:
        if not ai_engine_available:
            return jsonify({'error': 'Avatar service not available'}), 503
        
        ice_token_data = ai_engine.get_avatar_ice_token()
        
        if ice_token_data:
            # Add speech credentials to the response for avatar initialization
            ice_token_data['speechKey'] = ai_engine.AZURE_SPEECH_KEY
            ice_token_data['speechRegion'] = ai_engine.AZURE_SPEECH_REGION
            return jsonify(ice_token_data)
        else:
            # Return demo response instead of error
            return jsonify({'message': 'Avatar service running in demo mode', 'demo': True}), 200
    except Exception as e:
        print(f"Error getting ICE token: {e}")
        return jsonify({'error': 'Failed to get ICE token', 'details': str(e)}), 500

@app.route('/api/register-visitor', methods=['POST'])
def register_visitor():
    """Register a new visitor"""
    print("Route '/api/register-visitor' requested")
    
    try:
        data = request.json
        
        # Extract visitor information
        visitor_data = {
            'name': data.get('name'),
            'company': data.get('company'),
            'reason': data.get('reason'),
            'personToVisit': data.get('personToVisit'),
            'email': data.get('email', ''),
            'photo': data.get('photo', ''),
            'timestamp': data.get('timestamp')
        }
        
        # Here you could save to database, file, or external service
        print(f"Registering visitor: {visitor_data['name']} from {visitor_data['company']}")
        
        # For now, just return success
        return jsonify({
            'success': True,
            'message': f"Successful registration for {visitor_data['name']}",
            'visitorId': f"VIS_{data.get('timestamp', '12345')}"
        })
        
    except Exception as e:
        print(f"Error registering visitor: {e}")
        return jsonify({'error': 'Failed to register visitor', 'details': str(e)}), 500

@app.route('/api/show-form', methods=['POST'])
def show_form():
    """Trigger to show the check-in form"""
    print("Route '/api/show-form' requested")
    
    try:
        return jsonify({'action': 'show_form'})
    except Exception as e:
        print(f"Error showing form: {e}")
        return jsonify({'error': 'Failed to show form', 'details': str(e)}), 500



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
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    try:
        app.run(host='0.0.0.0', port=port, debug=debug_mode)
    except Exception as e:
        print(f"Error running Flask app: {e}")
    print("Flask app finished.")  # This line won't execute until you stop the server