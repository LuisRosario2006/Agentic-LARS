from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/start-conversation', methods=['GET'])
def start_conversation():
    return jsonify({
        'message': 'Hey! I see you\'re looking to optimize IT strategy. Have you considered a Solution Assessment?',
        'role': 'assistant'
    })

if __name__ == '__main__':
    app.run(debug=True)
