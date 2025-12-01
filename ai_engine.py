import os
import time
import requests
from io import BytesIO
import azure.cognitiveservices.speech as speechsdk
from azure.cognitiveservices.speech import SpeechSynthesizer, SpeechConfig, ResultReason
from azure.cognitiveservices.speech.audio import AudioOutputConfig
from dotenv import load_dotenv
import openai
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# Load local environment variables early for developer machines
try:
    load_dotenv()
    print("Loaded .env variables")
except Exception as _e:
    print(f"Could not load .env file: {_e}")
# Global variables
speech_config = None
synthesizer = None
client = None

# Configure speech service
def configure_speech():
    global speech_config
    try:
        if AZURE_SPEECH_KEY and AZURE_SPEECH_REGION and AZURE_SPEECH_KEY != "" and AZURE_SPEECH_REGION != "":
            print(f"Configuring speech with region: {AZURE_SPEECH_REGION}")
            speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
            speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
            speech_config.speech_recognition_language = "en-US"
            # Set output format to MP3
            speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)
            print("Speech configuration initialized successfully")
            return True
        else:
            print("Speech features disabled (no Azure Speech configuration)")
            speech_config = None
            return False
    except Exception as e:
        print(f"Error in speech configuration: {e}")
        speech_config = None
        return False

conversation_history = [
    {
        "role": "system",
        "content": """
You are the virtual receptionist for Apeiron's Tenerife Center of Excellence. You are a professional, warm, and helpful assistant dedicated to providing excellent visitor check-in services at this prestigious innovation center.

COMPANY INFORMATION:
- Company: Apeiron
- Location: Tenerife Center of Excellence
- Your role: Virtual Reception Assistant

MANDATORY RECEPTION FLOW:
1. Welcome visitors warmly
2. Ask for their name
3. Ask about the purpose of their visit
4. Guide them to complete the registration form
5. Confirm successful registration
6. Provide welcome and next steps

PROFESSIONAL GUIDELINES:
- Always be warm and welcoming
- Speak clearly and professionally
- Use visitor's name when possible
- Focus only on reception duties
- Guide visitors through the check-in process
- Never discuss business matters beyond reception

SAMPLE INTERACTIONS:
"Hello! Welcome to the Apeiron Tenerife Center of Excellence. I'm your virtual receptionist. May I have your name please?"
"Thank you, [name]. What brings you to our Center of Excellence today?"
"Perfect! Please complete the registration form on screen and take a photo when ready."
"Thank you [name]! You're all set. Someone from our Center of Excellence team will be with you shortly. Welcome!"

IMPORTANT: Stay focused on reception tasks only. Do not discuss presentations, assessments, or technical topics.

   - Start with overview, then details
   - Emphasize security and data protection
   - Explain technical concepts clearly
   - Highlight business value consistently
   - Reference real-world scenarios

3. Interaction Management:
   - Pause for questions regularly
   - Verify understanding of complex topics
   - Provide detailed answers when needed
   - Handle technical queries professionally

4. Auto-Advance Protocol:
   - Complete topic explanation
   - Verify no pending questions
   - Confirm understanding
   - Use [AUTO_ADVANCE] appropriately
   - Do NOT advance if:
     * Questions are pending
     * Complex topic needs clarification
     * User shows signs of needing more time
     * Additional explanation is needed

9. TECHNICAL REQUIREMENTS (Slides 46-50):
   - System specifications
   - Access requirements
   - Network configurations
   - Security prerequisites
   - Implementation considerations

10. NEXT STEPS AND CLOSING (Slides 51-55):
    - Action plan outline
    - Implementation timeline
    - Documentation handover
    - Support process
    - Final Q&A

PRESENTATION GUIDELINES:
1. Delivery Style:
   - Maintain professional expertise
   - Use clear, technical language
   - Balance detail with understanding
   - Regular comprehension checks
   - Encourage questions

2. Slide Navigation:
   - Use "Let's move to the next slide" for transitions
   - Add [AUTO_ADVANCE] when section is complete
   - Pause for questions between sections
   - Confirm understanding before advancing

3. Key Principles:
   - Emphasize Microsoft funding
   - Focus on security and compliance
   - Highlight business value
   - Maintain professional authority
   - Be precise with technical details


"""
    },
    {
        "role": "assistant",
        "content": "Hello! Welcome to the Apeiron Tenerife Center of Excellence. I'm your virtual reception assistant. Can you tell me your name to get started?"
    }
]

# 1️⃣ Connect to Azure Key Vault to Fetch API Keys
def get_key_vault_client():
    """Initialize Key Vault client with proper error handling"""
    key_vault_url = os.getenv("KEY_VAULT_URL", "https://kv-apeirona312485399456.vault.azure.net/")
    
    try:
        print("Attempting to connect to Key Vault...")
        # Try DefaultAzureCredential with shorter timeout
        from azure.identity import DefaultAzureCredential
        credential = DefaultAzureCredential(process_timeout=5)
        
        client = SecretClient(vault_url=key_vault_url, credential=credential)
        
        # Quick test - just try to get one specific secret without listing all
        try:
            test_secret = client.get_secret("AZURE-SPEECH-KEY")
            print("Successfully connected to Key Vault")
            return client
        except:
            print("Key Vault connected but no secrets accessible")
            return client
    
    except Exception as e:
        print(f"Info: Key Vault not accessible, using environment variables instead")
        return None

def get_secret(client, secret_name, default=None):
    """Safely retrieve a secret from Key Vault"""
    if not client:
        print(f"Warning: No Key Vault client available, cannot retrieve {secret_name}")
        return default
    
    try:
        return client.get_secret(secret_name).value
    except Exception as e:
        print(f"Error retrieving secret {secret_name}: {str(e)}")
        return default

def prefer_env_then_vault(secret_name_env, secret_name_vault=None):
    """Return value prioritizing explicit environment variable, then Key Vault, else None."""
    secret_name_vault = secret_name_vault or secret_name_env.replace('_', '-')
    env_val = os.getenv(secret_name_env)
    if env_val:
        return env_val
    if kv_client:
        return get_secret(kv_client, secret_name_vault)
    return None

# Initialize Key Vault client (best-effort; local dev may not have identity)
kv_client = get_key_vault_client()

# List all available secrets and their values (safely)
if kv_client:
    print("\nChecking secret values:")
    try:
        for secret_name in ["OPENAI-API-KEY", "OPENAI-ENDPOINT", "OPENAI-DEPLOYMENT-NAME", "AZURE-SPEECH-KEY", "AZURE-SPEECH-REGION"]:
            value = get_secret(kv_client, secret_name)
            if value:
                # Show first/last 4 chars for API keys, full value for non-sensitive data
                if "KEY" in secret_name:
                    print(f"- {secret_name}: {value[:4]}...{value[-4:]}")
                else:
                    print(f"- {secret_name}: {value}")
            else:
                print(f"- {secret_name}: [No value retrieved]")
    except Exception as e:
        print(f"Error checking secrets: {str(e)}")
    print("\n")

# Retrieve configuration values (env first, then Key Vault)
AZURE_SPEECH_KEY = prefer_env_then_vault("AZURE_SPEECH_KEY", "AZURE-SPEECH-KEY")
AZURE_SPEECH_REGION = prefer_env_then_vault("AZURE_SPEECH_REGION", "AZURE-SPEECH-REGION")
OPENAI_API_KEY = prefer_env_then_vault("OPENAI_API_KEY", "OPENAI-API-KEY")
OPENAI_ENDPOINT = prefer_env_then_vault("OPENAI_ENDPOINT", "OPENAI-ENDPOINT")
OPENAI_DEPLOYMENT_NAME = prefer_env_then_vault("OPENAI_DEPLOYMENT_NAME", "OPENAI-DEPLOYMENT-NAME")

# Set environment variables for OpenAI client
if OPENAI_API_KEY:
    os.environ["AZURE_OPENAI_API_KEY"] = OPENAI_API_KEY

# Initialize default values
base_endpoint = None
api_version = "2024-08-01-preview"  # Default API version

# Set Azure OpenAI endpoint
if OPENAI_ENDPOINT:
    # Extract base endpoint (remove deployment path and query parameters)
    if "/openai/deployments" in OPENAI_ENDPOINT:
        base_endpoint = OPENAI_ENDPOINT.split("/openai/deployments")[0]
    else:
        base_endpoint = OPENAI_ENDPOINT.split("?")[0]
    os.environ["AZURE_OPENAI_ENDPOINT"] = base_endpoint
    print(f"Setting Azure OpenAI endpoint to: {base_endpoint}")

# Extract API version from endpoint URL and set it
if OPENAI_ENDPOINT and "api-version=" in OPENAI_ENDPOINT:
    api_version = OPENAI_ENDPOINT.split("api-version=")[-1].split("&")[0]
    os.environ["OPENAI_API_VERSION"] = api_version
    print(f"Setting API version to: {api_version}")
else:
    print(f"Using default API version: {api_version}")

# Validate required configuration
missing_openai_config = []
if not OPENAI_API_KEY:
    missing_openai_config.append("API Key")
if not OPENAI_ENDPOINT:
    missing_openai_config.append("Endpoint")
if not OPENAI_DEPLOYMENT_NAME:
    missing_openai_config.append("Deployment Name")

if missing_openai_config:
    print(f"Info: Running in demo mode - OpenAI configuration not available: {', '.join(missing_openai_config)}")
    print("AI responses will show demo messages. Configure credentials for full functionality.")
    # Set client to None to trigger demo mode
    client = None

missing_speech_config = []
if not AZURE_SPEECH_KEY:
    missing_speech_config.append("Speech Key")
if not AZURE_SPEECH_REGION:
    missing_speech_config.append("Region")

# Speech configuration check (simplified)
if missing_speech_config:
    print("Info: Speech services not configured - text-based interaction available")

# Configure OpenAI client
try:
    if OPENAI_API_KEY and OPENAI_ENDPOINT and base_endpoint:
        from openai import AzureOpenAI
        
        # Initialize AzureOpenAI client for v1.x
        client = AzureOpenAI(
            api_key=OPENAI_API_KEY,
            api_version=api_version,
            azure_endpoint=base_endpoint
        )
        
        print("OpenAI client initialized successfully")
    else:
        print("OpenAI client not configured - missing API key, endpoint, or invalid endpoint format")
        if not OPENAI_API_KEY:
            print("  - Missing API key")
        if not OPENAI_ENDPOINT:
            print("  - Missing endpoint")
        if not base_endpoint:
            print("  - Could not extract base endpoint from provided endpoint")
        client = None
except Exception as e:
    print(f"Error configuring OpenAI client: {e}")
    import traceback
    traceback.print_exc()
    client = None

# Initialize speech configuration
configure_speech()
print("Speech config status:", "Initialized" if speech_config else "Not initialized")

def get_initial_message():
    """Get the initial message from the AI assistant"""
    return conversation_history[-1]["content"]
#Validated Speech to Text
def speech_to_text():
    """Convert speech to text using Azure Speech Services"""
    try:
        if not speech_config:
            configure_speech()
            if not speech_config:
                return "Speech recognition disabled - no Azure Speech configuration available"

        # Using Windows API for microphone detection
        try:
            import wmi
            c = wmi.WMI()
            microphones = c.Win32_SoundDevice()
            mic_found = False
            
            for mic in microphones:
                if 'microphone' in mic.Name.lower() or 'audio input' in mic.Name.lower():
                    print(f"Found microphone: {mic.Name}")
                    mic_found = True
                    break
                    
            if not mic_found:
                print("No microphone found in system devices")
                return "ERROR: No microphone detected. Please check your microphone connection and settings."
                
            print("Microphone check completed successfully")
            
        except Exception as mic_error:
            print(f"Warning: Could not check microphone using WMI: {mic_error}")
            # Continue anyway as the microphone might still work
            
        # Configure audio input with more detailed error handling
        try:
            audio_config = speechsdk.AudioConfig(use_default_microphone=True)
            if not audio_config:
                return "ERROR: Could not initialize audio configuration. Please check your microphone settings."
                
            speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
            print("Speech recognizer initialized successfully")
            
        except Exception as audio_error:
            print(f"Error configuring audio: {audio_error}")
            return "ERROR: Could not access the microphone. Please check your browser settings and microphone permissions."
            
        # Configurar el reconocimiento de voz con más detalles de diagnóstico
        audio_config = speechsdk.AudioConfig(use_default_microphone=True)
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
        
        # Agregar manejadores de eventos para diagnóstico
        def handle_recognizing(evt):
            print(f"RECOGNIZING: {evt}")
        
        def handle_recognized(evt):
            print(f"RECOGNIZED: {evt}")
        
        speech_recognizer.recognizing.connect(handle_recognizing)
        speech_recognizer.recognized.connect(handle_recognized)

        print("Listening... Please speak now.")
        speech_recognition_result = speech_recognizer.recognize_once()

        if speech_recognition_result.reason == speechsdk.ResultReason.RecognizedSpeech:
            recognized_text = speech_recognition_result.text
            print(f"Successfully recognized: {recognized_text}")
            return recognized_text
        elif speech_recognition_result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = speechsdk.CancellationDetails(speech_recognition_result)
            error_message = f"Speech Recognition canceled: {cancellation_details.reason}\nError details: {cancellation_details.error_details}"
            print(error_message)
            return f"ERROR: {error_message}"
        elif speech_recognition_result.reason == speechsdk.ResultReason.NoMatch:
            print("No speech could be recognized. Please check your microphone and try speaking more clearly.")
            return "ERROR: No speech detected. Please check your microphone and try speaking more clearly."
            
        print(f"Recognition result: {speech_recognition_result.reason}")
        return ""
            
    except Exception as e:
        error_message = f"Error in speech recognition: {str(e)}"
        print(error_message)
        return f"ERROR: {error_message}"
    
    return ""

def process_presentation_command(text):
    """Process presentation control commands and slide changes"""
    # Initialize variables
    import re
    script_commands = []
    final_text = text

    # Check for slide change notification
    slide_change = re.search(r'\[SLIDE_CHANGE:(\d+)\]', text)
    if slide_change:
        slide_number = int(slide_change.group(1))
        conversation_history.append({
            "role": "system",
            "content": f"[The presentation is now showing slide {slide_number}. Adapt your next response accordingly.]"
        })
        script_commands.append("window.avatarController.forceStop();")
        script_commands.append("window.presentationController.handleSlideChange();")
        return f'<script>{" ".join(script_commands)}</script>'

    # Process presentation commands
    commands = {
        "Let's move to the next slide": "nextSlide",
        "Let's go back to the previous slide": "previousSlide"
    }
    
    # Check for specific slide number command
    slide_number_match = re.search(r"Let's move to slide (\d+)", text)
    
    if slide_number_match:
        slide_number = int(slide_number_match.group(1))
        script_commands.append("window.avatarController.forceStop();")
        script_commands.append(f"window.presentationController.goToSlide({slide_number});")
        final_text = re.sub(r'Let\'s move to slide \d+\.?\s*', '', text).strip()
    else:
        for command, action in commands.items():
            if command.lower() in text.lower():
                script_commands.append("window.avatarController.forceStop();")
                script_commands.append(f"window.presentationController.{action}();")
                final_text = text.replace(command, '').strip()
                break
    
    if script_commands:
        return f'<script>{" ".join(script_commands)}</script> {final_text}'
    return final_text

def get_gpt_response(user_text):
    """Get a response from OpenAI's GPT model"""
    global conversation_history, client
    # If official client failed to init but config present, try REST fallback
    def rest_fallback(messages):
        try:
            if not (OPENAI_API_KEY and OPENAI_ENDPOINT and OPENAI_DEPLOYMENT_NAME):
                return None
            # Use provided full endpoint (already includes deployment & api-version)
            url = OPENAI_ENDPOINT
            headers = {
                'api-key': OPENAI_API_KEY,
                'Content-Type': 'application/json'
            }
            payload = {
                'messages': messages,
                'temperature': 0.7
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if 'choices' in data and data['choices']:
                    return data['choices'][0]['message']['content']
            else:
                print(f"REST fallback non-200: {resp.status_code} {resp.text[:200]}")
            return None
        except Exception as e:
            print(f"REST fallback error: {e}")
            return None

    if not client:
        # Attempt REST call before demo
        conversation_history.append({"role": "user", "content": user_text})
        ai_text = rest_fallback(conversation_history)
        if ai_text:
            conversation_history.append({"role": "assistant", "content": ai_text})
            return ai_text
        # Demo fallback
        demo_responses = [
            "Hello! I'm your virtual receptionist. How can I help you with your visit today?",
            "Thank you for visiting us. I'm here to assist with your check-in process.",
            "Welcome! Is there anything I can help you with regarding your visit?",
            "I'm here to help you register your visit. What brings you here today?"
        ]
        import random
        demo_message = random.choice(demo_responses)
        print("Info: Responding in demo mode (REST unavailable)")
        conversation_history.append({"role": "assistant", "content": demo_message})
        return demo_message

    try:
        # Add user's message to conversation history
        conversation_history.append({"role": "user", "content": user_text})
        
        # Create the chat completion request
        response = client.chat.completions.create(
            model=OPENAI_DEPLOYMENT_NAME,
            messages=conversation_history
        )
        
        ai_response = response.choices[0].message.content
        
        # Remove any existing script tags
        import re
        ai_response = re.sub(r'<script>.*?</script>', '', ai_response)
        
        # Store in conversation history and return
        conversation_history.append({"role": "assistant", "content": ai_response})
        return ai_response
    except Exception as e:
        print(f"Error getting GPT response: {e}")
        error_message = "I'm having trouble connecting to my systems. Could we try again in a moment?"
        conversation_history.append({"role": "assistant", "content": error_message})
        return error_message

def synthesize_speech(text):
    """Convert text to speech using Azure Speech Services and return audio stream"""
    temp_filename = "temp_output.mp3"
    
    try:
        if not speech_config:
            configure_speech()
            if not speech_config:
                print("Speech synthesis disabled - no Azure Speech configuration available")
                return None
        
        # Configure audio output to file
        audio_config = AudioOutputConfig(filename=temp_filename)

        # Create a speech synthesizer with proper cleanup
        synthesizer = SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
        result = synthesizer.speak_text_async(text).get()
        
        if result.reason == ResultReason.SynthesizingAudioCompleted:
            print("Speech synthesis succeeded")
            # Explicitly close the synthesizer to release file handles
            del synthesizer
            time.sleep(0.1)  # Brief delay to ensure file handle is released
            
            # Read the audio file
            with open(temp_filename, "rb") as f:
                audio_data = f.read()
            
            # Clean up the temporary file
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
            
            # Create and return memory stream
            audio_stream = BytesIO(audio_data)
            audio_stream.seek(0)
            return audio_stream
        else:
            print(f"Speech synthesis failed: {result.reason}")
            del synthesizer
            return None

    except Exception as e:
        print(f"Error in speech synthesis: {e}")
        return None
    finally:
        # Ensure temporary file is always cleaned up
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except Exception as cleanup_error:
                print(f"Warning: Could not remove temporary file: {cleanup_error}")

def reset_conversation():
    """Reset the conversation to initial state"""
    global conversation_history
    conversation_history = conversation_history[:2]

def get_config_status():
    """Return a diagnostic dict indicating current config and modes."""
    return {
        "openai_configured": bool(client),
        "speech_configured": bool(speech_config),
        "missing_openai": [
            name for name, val in {
                "OPENAI_API_KEY": OPENAI_API_KEY,
                "OPENAI_ENDPOINT": OPENAI_ENDPOINT,
                "OPENAI_DEPLOYMENT_NAME": OPENAI_DEPLOYMENT_NAME
            }.items() if not val
        ],
        "missing_speech": [
            name for name, val in {
                "AZURE_SPEECH_KEY": AZURE_SPEECH_KEY,
                "AZURE_SPEECH_REGION": AZURE_SPEECH_REGION
            }.items() if not val
        ],
        "base_endpoint": base_endpoint,
        "api_version": api_version,
        "demo_mode": client is None,
    }

def get_avatar_ice_token():
    """
    Get ICE server token for avatar WebRTC connection from Azure Speech Service.
    Returns a dictionary with ICE server configuration.
    """
    try:
        if not AZURE_SPEECH_KEY or not AZURE_SPEECH_REGION or AZURE_SPEECH_KEY == "" or AZURE_SPEECH_REGION == "":
            print("Avatar service disabled - no Azure Speech configuration available")
            return None
        
        # Construct the endpoint URL for ICE token
        ice_token_url = f"https://{AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1"
        
        headers = {
            "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY
        }
        
        print(f"Requesting ICE token from: {ice_token_url}")
        
        response = requests.get(ice_token_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            ice_data = response.json()
            print("Successfully retrieved ICE token")
            return ice_data
        else:
            print(f"Failed to get ICE token. Status code: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error getting ICE token: {e}")
        import traceback
        traceback.print_exc()
        return None

# OpenAI connection is already validated during client initialization