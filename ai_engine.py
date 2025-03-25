import os
import azure.cognitiveservices.speech as speechsdk
import openai
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import tempfile
import uuid

# Global variables
speech_config = None
synthesizer = None
client = None
conversation_history = [
    {"role": "system", "content": """
    You are an AI sales representative specializing in Solution Assessments.
    Your mission is to lead a full kickoff call, actively guiding the customer from initial engagement to next steps.
 
    🔹 **Key Behavior Guidelines:**
    - **Start the conversation proactively.**
    - **Ask leading questions** to identify the customer's needs.
    - **Explain the SA process dynamically** based on their responses.
    - **Handle objections and push up to three times before accepting a 'No'.**
    - **Maintain continuity instead of resetting after each response.**
 
    🔹 **Conversation Flow:**
    2. **Identify customer needs** by asking: "What are your biggest challenges right now?"
    3. **Dynamically tailor explanations** based on their responses.
    4. **Encourage next steps**: "Would you like to schedule a quick call?"
    5. **Handle objections and push gently** (up to three attempts).
    6. **If customer is firm on 'No'**, offer a follow-up later.
    """},
    {"role": "assistant", "content": "Hey! I see you're looking to optimize IT strategy. Have you considered a Solution?"}
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
    # Configure Azure Speech services
speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
# Configure OpenAI client
client = openai.AzureOpenAI(
api_key=OPENAI_API_KEY,
api_version="2024-02-15-preview",
azure_endpoint=OPENAI_ENDPOINT)

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
    """Convert text to speech using Azure Speech Services"""
    try:
        result = synthesizer.speak_text_async(text).get()
        
        # In a web context, you'd typically save this to a file and return the URL
        # This is a simplified version
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            print("Speech synthesis succeeded")
            return True
        else:
            print(f"Speech synthesis failed: {result.reason}")
            return False
    except Exception as e:
        print(f"Error in speech synthesis: {e}")
        return False

def reset_conversation():
    """Reset the conversation to initial state"""
    global conversation_history
    conversation_history = conversation_history[:2]  # Keep system prompt and initial message