import os
import time
from io import BytesIO
import azure.cognitiveservices.speech as speechsdk
from azure.cognitiveservices.speech import SpeechSynthesizer, SpeechConfig, ResultReason
from azure.cognitiveservices.speech.audio import AudioOutputConfig
import openai
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.cognitiveservices.speech.audio import AudioOutputConfig
import os
# Global variables
speech_config = None
synthesizer = None
client = None

# Configure speech service
def configure_speech():
    global speech_config
    try:
        if AZURE_SPEECH_KEY and AZURE_SPEECH_REGION:
            print(f"Configuring speech with region: {AZURE_SPEECH_REGION}")
            speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
            speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
            speech_config.speech_recognition_language = "en-US"
            # Set output format to MP3
            speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)
            print("Speech configuration initialized successfully")
            return True
        else:
            print("Speech configuration failed - missing key or region")
            print(f"Key available: {'Yes' if AZURE_SPEECH_KEY else 'No'}")
            print(f"Region available: {'Yes' if AZURE_SPEECH_REGION else 'No'}")
            return False
    except Exception as e:
        print(f"Error in speech configuration: {e}")
        return False

conversation_history = [
    {
        "role": "system",
        "content": """
You are an AI Solution Assessment Assistant designed to guide customers through the Solution Assessment (SA) process. Your primary role is to clearly explain the process and answer initial questions before the Solution Assessment Consultant (SAC) joins.

You must explain 1 stage at the time once you get confirmation you move to the next one:
- Discovery: Gathering information about their IT environment (systems, cloud readiness, network details, etc.).
- Analysis: Using Microsoft tools like Azure Migrate and Dr. Migrate to scan, analyze, and generate insights for cloud optimization.
- Recommendations: Offering customized strategies for migration, modernization, security, and optimization based on the data.
- Planning and Decision Support: Helping them create a clear cloud roadmap aligned to their business goals.

Emphasize:
- Try to keep your answers concise and to the point so you can allow users to ask more questions
- The process duration (2–4 weeks, depending on readiness).
- Data collection steps involving the Azure Migrate Appliance.
- Outputs (reports accessible through Power BI, no expiration).

When asked about prerequisites, you must explain:
- Customers must provide a technical contact with admin access to environments.
- Allow inbound and outbound network connectivity for appliance deployment.
- Meet minimum server or appliance requirements (RAM, CPUs, storage).
- Grant read-only access to vCenter/Hyper-V/physical servers.
- Ensure necessary ports are open (example: Port 443, Port 3389, WinRM 5985, SSH 22 depending on server type).

Important:
- Answer prerequisites questions briefly but confidently.
- Do not overpromise, always recommend that the SAC will validate technical details later.

Always invite more questions to keep the conversation flowing.
Keep your tone professional, structured, and friendly.
"""
    },
    {
        "role": "assistant",
        "content": "Hello, I’m your AI-powered assistant, here to guide you through Microsoft’s Solution Assessment process. Whether you need clarity, next steps, or best practices—I'm available anytime to streamline your cloud journey. Shall we get started?"
    }
]

# 1️⃣ Connect to Azure Key Vault to Fetch API Keys
def get_key_vault_client():
    """Initialize Key Vault client with proper error handling"""
    key_vault_url = os.getenv("KEY_VAULT_URL", "https://kv-apeirona312485399456.vault.azure.net/")
    
    try:
        # Try DefaultAzureCredential first
        credential = DefaultAzureCredential()
        # Test the credential
        token = credential.get_token("https://vault.azure.net/.default")
        if not token:
            raise Exception("No token obtained")
            
        client = SecretClient(vault_url=key_vault_url, credential=credential)
        # Test the client with a simple operation
        list(client.list_properties_of_secrets(max_page_size=1))
        print("Successfully connected to Key Vault")
        return client
    
    except Exception as e:
        print(f"Warning: Failed to connect to Key Vault using DefaultAzureCredential: {str(e)}")
        try:
            # Try Azure CLI credential as fallback
            from azure.identity import AzureCliCredential
            credential = AzureCliCredential()
            client = SecretClient(vault_url=key_vault_url, credential=credential)
            # Test the client
            list(client.list_properties_of_secrets(max_page_size=1))
            print("Successfully connected to Key Vault using Azure CLI credential")
            return client
        except Exception as cli_error:
            print(f"Error: Could not connect to Key Vault using Azure CLI credential either: {str(cli_error)}")
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

# Initialize Key Vault client
kv_client = get_key_vault_client()

# List all available secrets and their values (safely)
if kv_client:
    print("\nChecking secret values:")
    try:
        for secret_name in ["OPENAI-API-KEY", "OPENAI-ENDPOINT", "OPENAI-DEPLOYMENT-NAME"]:
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

# Retrieve API Keys from Key Vault with fallback to environment variables
AZURE_SPEECH_KEY = get_secret(kv_client, "AZURE-SPEECH-KEY") or os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = get_secret(kv_client, "AZURE-SPEECH-REGION") or os.getenv("AZURE_SPEECH_REGION")
OPENAI_API_KEY = get_secret(kv_client, "OPENAI-API-KEY") or os.getenv("OPENAI_API_KEY")
OPENAI_ENDPOINT = get_secret(kv_client, "OPENAI-ENDPOINT") or os.getenv("OPENAI_ENDPOINT")
OPENAI_DEPLOYMENT_NAME = get_secret(kv_client, "OPENAI-DEPLOYMENT-NAME") or os.getenv("OPENAI_DEPLOYMENT_NAME")

# Set environment variables for OpenAI client
if OPENAI_API_KEY:
    os.environ["AZURE_OPENAI_API_KEY"] = OPENAI_API_KEY

# Set Azure OpenAI endpoint
if OPENAI_ENDPOINT:
    base_endpoint = OPENAI_ENDPOINT.split("/openai/deployments")[0]
    os.environ["AZURE_OPENAI_ENDPOINT"] = base_endpoint
    print(f"Setting Azure OpenAI endpoint to: {base_endpoint}")

# Extract API version from endpoint URL and set it
if OPENAI_ENDPOINT and "api-version=" in OPENAI_ENDPOINT:
    api_version = OPENAI_ENDPOINT.split("api-version=")[-1].split("&")[0]
    os.environ["OPENAI_API_VERSION"] = api_version
    print(f"Setting API version to: {api_version}")

# Clean up endpoint URL to remove query parameters
if OPENAI_ENDPOINT:
    OPENAI_ENDPOINT = OPENAI_ENDPOINT.split("?")[0]

# Validate required configuration
if not all([OPENAI_API_KEY, OPENAI_ENDPOINT, OPENAI_DEPLOYMENT_NAME]):
    print("Warning: Missing required OpenAI configuration. Please check Key Vault access or environment variables.")
    print(f"  API Key: {'Set' if OPENAI_API_KEY else 'Missing'}")
    print(f"  Endpoint: {'Set' if OPENAI_ENDPOINT else 'Missing'}")
    print(f"  Deployment: {'Set' if OPENAI_DEPLOYMENT_NAME else 'Missing'}")

if not all([AZURE_SPEECH_KEY, AZURE_SPEECH_REGION]):
    print("Warning: Missing Azure Speech configuration. Speech-to-text and text-to-speech features will be unavailable.")
    print(f"  Speech Key: {'Set' if AZURE_SPEECH_KEY else 'Missing'}")
    print(f"  Region: {'Set' if AZURE_SPEECH_REGION else 'Missing'}")

# Configure OpenAI client
try:
    if OPENAI_API_KEY and OPENAI_ENDPOINT:
        # Use legacy import for better compatibility
        import openai

        # Set up configuration
        openai.api_type = "azure"
        openai.api_base = base_endpoint
        openai.api_version = api_version
        openai.api_key = OPENAI_API_KEY

        print("OpenAI configuration set successfully")
        # Using the module directly in v0.28.1
        client = openai
        print("OpenAI client set successfully")
    else:
        print("OpenAI client not configured - missing API key or endpoint")
        client = None
except Exception as e:
    print(f"Error configuring OpenAI client: {e}")
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
                return "ERROR: Speech services not configured"

        audio_config = speechsdk.AudioConfig(use_default_microphone=True)
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        print("Listening...")
        speech_recognition_result = speech_recognizer.recognize_once()

        if speech_recognition_result.reason == speechsdk.ResultReason.RecognizedSpeech:
            recognized_text = speech_recognition_result.text
            print(f"Recognized: {recognized_text}")
            return recognized_text
        elif speech_recognition_result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = speechsdk.CancellationDetails(speech_recognition_result)
            print(f"Speech Recognition canceled: {cancellation_details.reason}")
            print(f"Error details: {cancellation_details.error_details}")
            return ""
            
        print(f"No speech could be recognized: {speech_recognition_result.reason}")
        return ""
            
    except Exception as e:
        print(f"Error in speech recognition: {str(e)}")
        return ""
    
    return ""

def get_gpt_response(user_text):
    """Get a response from OpenAI's GPT model"""

    global conversation_history, client

    # Add user input to conversation history
    conversation_history.append({"role": "user", "content": user_text})
    
    try:
        response = client.chat.completions.create(
            model=OPENAI_DEPLOYMENT_NAME,
            messages=conversation_history
        )
        
        ai_response = response.choices[0].message.content
        conversation_history.append({"role": "assistant", "content": ai_response})
        return ai_response
    except Exception as e:
        print(f"Error getting GPT response: {e}")
        error_message = "I'm having trouble connecting to my systems. Could we try again in a moment?"
        conversation_history.append({"role": "assistant", "content": error_message})
        return error_message

def synthesize_speech(text):
    """Convert text to speech using Azure Speech Services and return audio stream"""
    try:
        if not speech_config:
            configure_speech()
            if not speech_config:
                print("Speech configuration is not initialized")
                return None
            
        # Temporary file for saving audio
        temp_filename = "temp_output.mp3"
        audio_config = AudioOutputConfig(filename=temp_filename)

        # Create a speech synthesizer and ensure proper cleanup
        synthesizer = None
        try:
            synthesizer = SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
            result = synthesizer.speak_text_async(text).get()
            
            if result.reason == ResultReason.SynthesizingAudioCompleted:
                print("Speech synthesis succeeded")
                # Need to release synthesizer before accessing the file
                synthesizer = None
                time.sleep(0.5)  # Short delay for file handle release
                
                # Read the audio file
                with open(temp_filename, "rb") as f:
                    audio_data = f.read()
                
                # Create memory stream
                audio_stream = BytesIO(audio_data)
                os.remove(temp_filename)  # Clean up the temporary file
                audio_stream.seek(0)  # Reset stream position
                return audio_stream
            else:
                print(f"Speech synthesis failed: {result.reason}")
                return None
        finally:
            # Ensure synthesizer is always cleaned up
            if synthesizer:
                synthesizer = None

    except Exception as e:
        print(f"Error in speech synthesis: {e}")
        # Clean up temporary file if it exists
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except:
                pass
        return None

def reset_conversation():
    """Reset the conversation to initial state"""
    global conversation_history
    conversation_history = conversation_history[:2]  # Keep system prompt and initial message

# OpenAI connection is already validated during client initialization