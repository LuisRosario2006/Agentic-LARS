import os
import azure.cognitiveservices.speech as speechsdk
import openai
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

import time
from io import BytesIO
from azure.cognitiveservices.speech import SpeechSynthesizer, SpeechConfig, ResultReason
from azure.cognitiveservices.speech.audio import AudioOutputConfig
import os
# Global variables
speech_config = None
synthesizer = None
client = None
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
key_vault_url = f"https://kv-apeirona312485399456.vault.azure.net/"
credential = DefaultAzureCredential()
kv_client = SecretClient(vault_url=key_vault_url, credential=credential)
# Retrieve API Keys from Key Vault
AZURE_SPEECH_KEY = kv_client.get_secret("AZURE-SPEECH-KEY").value
AZURE_SPEECH_REGION = kv_client.get_secret("AZURE-SPEECH-REGION").value
OPENAI_API_KEY = kv_client.get_secret("OPENAI-API-KEY").value
OPENAI_ENDPOINT = kv_client.get_secret("OPENAI-ENDPOINT").value


OPENAI_DEPLOYMENT_NAME = kv_client.get_secret("OPENAI-DEPLOYMENT-NAME").value

# Configure OpenAI client
client = openai.AzureOpenAI(
api_key=OPENAI_API_KEY,
api_version="2024-02-15-preview",
azure_endpoint=OPENAI_ENDPOINT)

speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"

def get_initial_message():
    """Get the initial message from the AI assistant"""
    return conversation_history[-1]["content"]
#Validated Speech to Text
def speech_to_text():
    """Convert speech to text using Azure Speech Services"""
    
    audio_config = speechsdk.AudioConfig(use_default_microphone=True)
    recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

    print("Listening...")
    result = recognizer.recognize_once()

    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        return result.text
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print("No speech could be recognized")
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
        # Azure Speech Configuration (Replace with your actual key and region)
            # Configure Azure Speech services

        
        # Temporary file for saving audio (Azure SDK limitation)
        temp_filename = "temp_output.mp3"
        audio_config = AudioOutputConfig(filename=temp_filename)

        # Create a speech synthesizer
        synthesizer = SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
        
        # Synthesize speech to the temporary file
        result = synthesizer.speak_text_async(text).get()
        
        if result.reason == ResultReason.SynthesizingAudioCompleted:
            print("Speech synthesis succeeded")

            # Force releasing file handle by setting synthesizer to None and adding delay
            synthesizer = None
            time.sleep(1)  # Give the system some time to release the file handle

            # Retry mechanism to ensure the file is accessible
            max_attempts = 10
            attempts = 0
            while attempts < max_attempts:
                try:
                    with open(temp_filename, "rb") as f:
                        audio_data = f.read()  # Read the entire file into memory
                    break  # Exit the loop if file reading is successful
                except Exception as e:
                    print(f"File access error, retrying... Attempt {attempts + 1}")
                    attempts += 1
                    time.sleep(0.5)

            if attempts == max_attempts:
                print(f"Failed to access the file after {max_attempts} attempts.")
                return None

            # ✅ Convert to BytesIO object (Very Important)
            audio_stream = BytesIO(audio_data)
            os.remove(temp_filename)  # Delete the temporary file
            audio_stream.seek(0)  # Reset the stream position to the beginning
            
            return audio_stream  # Return the in-memory audio stream

        elif result.reason == ResultReason.Canceled:
            cancellation_details = result.cancellation_details
            print(f"Speech synthesis canceled: {cancellation_details.reason}")
            if cancellation_details.error_details:
                print(f"Error details: {cancellation_details.error_details}")
            return None

    except Exception as e:
        print(f"Error in speech synthesis: {e}")
        return None

    except Exception as e:
        print(f"Error in speech synthesis: {e}")
        return None

def reset_conversation():
    """Reset the conversation to initial state"""
    global conversation_history
    conversation_history = conversation_history[:2]  # Keep system prompt and initial message