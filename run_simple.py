import os
import sys

# Set environment variables to bypass Key Vault
os.environ["AZURE_SPEECH_KEY"] = ""
os.environ["AZURE_SPEECH_REGION"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["OPENAI_ENDPOINT"] = ""
os.environ["OPENAI_DEPLOYMENT_NAME"] = ""

# Mock the Key Vault client to return None
sys.modules['azure.keyvault.secrets'] = None
sys.modules['azure.identity'] = None

# Now import and run the app
from app import app

if __name__ == '__main__':
    print("Starting Flask app without Azure dependencies...")
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)