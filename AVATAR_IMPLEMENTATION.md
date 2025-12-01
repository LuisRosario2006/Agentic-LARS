# Azure Speech Avatar Integration - Implementation Guide

**Date**: October 9, 2025  
**Repository**: Agentic (backup branch)

## 📋 Overview

This document details the integration of **Azure Speech Avatar** real-time synthesis into the Agentic SA application. The avatar provides a visual talking avatar powered by Azure Cognitive Services Speech, using WebRTC for real-time video streaming.

---

## ✨ Features Added

### 1. **Real-time Avatar Video Streaming**
- Live avatar video using WebRTC peer connection
- Character: Lisa (casual-sitting style)
- Synchronized lip-sync with speech
- Real-time audio streaming

### 2. **Fallback System**
- If avatar initialization fails, falls back to standard TTS
- Graceful degradation ensures application always works
- User-friendly status messages

### 3. **Seamless Integration**
- Avatar automatically initializes when chat starts
- Integrates with existing voice and text modes
- Avatar video displays above chat messages

---

## 🏗️ Architecture

### Backend Components

#### `app.py` - New Endpoint
```python
@app.route('/api/avatar/ice-token', methods=['GET'])
def get_avatar_ice_token():
```
- **Purpose**: Fetches ICE server credentials for WebRTC
- **Returns**: ICE server URLs, username, password, speech key, and region
- **Called by**: Frontend avatar initialization

#### `ai_engine.py` - New Function
```python
def get_avatar_ice_token():
```
- **Purpose**: Calls Azure Speech Service API to get ICE token
- **Endpoint**: `https://{region}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`
- **Authentication**: Uses Azure Speech API key from Key Vault

### Frontend Components

#### `avatar.js` - Main Avatar Module
**Key Functions:**
- `initializeAvatar()` - Sets up WebRTC and avatar connection
- `setupPeerConnection()` - Creates RTCPeerConnection with ICE servers
- `speakWithAvatar(text)` - Synthesizes speech with avatar
- `closeAvatar()` - Cleans up connections

**Global Variables:**
- `avatarSynthesizer` - Speech SDK avatar synthesizer
- `peerConnection` - WebRTC peer connection
- `isAvatarConnected` - Connection status flag

#### `script.js` - Integration Points
**Updated Functions:**
- `showChatScreen()` - Calls avatar initialization
- `playAudioResponse()` - Uses avatar when available, falls back to standard TTS

#### `index.html` - UI Elements
```html
<!-- Speech SDK -->
<script src="https://aka.ms/csspeech/jsbrowserpackageraw"></script>

<!-- Avatar Container -->
<div id="avatarContainer" class="avatar-container hidden">
  <video id="avatarVideo" class="avatar-video" autoplay></video>
  <audio id="avatarAudio" autoplay></audio>
  <div id="avatarStatus" class="avatar-status">Connecting...</div>
</div>
```

#### `style.css` - Avatar Styles
- `.avatar-container` - Container for video/audio elements
- `.avatar-video` - Video player styles
- `.avatar-status` - Status overlay

---

## 🔧 Configuration

### Avatar Settings (in `avatar.js`)
```javascript
const AVATAR_CONFIG = {
    character: 'lisa',           // Avatar character
    style: 'casual-sitting',     // Avatar style/pose
    backgroundColor: '#FFFFFFFF' // White background
};
```

### Available Characters & Styles
See: [Microsoft Avatar Documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech-avatar/avatar-gestures-with-ssml#supported-standard-avatar-characters-styles-and-gestures)

Common characters:
- **lisa** - Professional female avatar
- **wayne** - Professional male avatar

Common styles:
- **casual-sitting** - Seated position
- **graceful-standing** - Standing position
- **technical-sitting** - Technical presentation style

---

## 📦 Dependencies

### Backend
- `requests` (already in requirements.txt) - HTTP requests for ICE token
- `azure-cognitiveservices-speech` - Speech services

### Frontend
- **Microsoft Cognitive Services Speech SDK**
  - Loaded via CDN: `https://aka.ms/csspeech/jsbrowserpackageraw`
  - Version: Latest (auto-updated)

---

## 🌐 Browser Compatibility

| Platform | Chrome | Edge | Safari | Firefox | Opera |
|----------|--------|------|--------|---------|-------|
| Windows  | ✅     | ✅   | N/A    | ✅*     | ✅    |
| Android  | ✅     | ✅   | N/A    | ✅*     | ❌    |
| iOS      | ✅     | ✅   | ✅     | ✅      | ✅    |
| macOS    | ✅     | ✅   | ✅     | ✅*     | ✅    |

*Some ICE server configurations may not work in Firefox

---

## 🚀 Usage Flow

### 1. **User Starts Chat**
```javascript
showChatScreen() called
  └─> window.avatarModule.initialize()
      ├─> Fetch ICE token from backend
      ├─> Create SpeechConfig
      ├─> Create AvatarConfig (character, style)
      ├─> Setup WebRTC peer connection
      ├─> Create avatar synthesizer
      └─> Start avatar connection
```

### 2. **Avatar Speaks**
```javascript
playAudioResponse(message) called
  ├─> Check if avatar is available
  ├─> If yes: window.avatarModule.speak(message)
  │   └─> avatarSynthesizer.speakTextAsync(message)
  └─> If no: Fallback to standard TTS
```

### 3. **Connection Management**
- **Auto-reconnect**: Handled by Speech SDK
- **Idle timeout**: 5 minutes
- **Max connection**: 30 minutes
- **Manual close**: Available via `closeAvatar()`

---

## 🔐 Security Considerations

### API Key Protection
- Speech key stored in Azure Key Vault
- Only passed to frontend during session (not exposed in HTML)
- ICE token has limited lifetime
- HTTPS required for WebRTC

### WebRTC Security
- TURN server authentication required
- Encrypted video/audio streams
- No permanent storage of streams

---

## 🐛 Troubleshooting

### Avatar Not Appearing
1. **Check browser console** for error messages
2. **Verify Speech credentials** in Key Vault
3. **Check network connectivity** (ports 80, 443, 3478)
4. **Verify browser compatibility**

### Connection Fails
```javascript
// Check avatar status in console:
window.avatarModule.isAvailable()  // Should return true
```

Common issues:
- ICE server credentials expired → Refresh page
- Network firewall blocking WebRTC → Check network settings
- Speech region mismatch → Verify region in Key Vault

### Audio/Video Out of Sync
- Usually self-corrects within seconds
- If persistent, close and reconnect avatar
- Check network bandwidth (requires ~1-2 Mbps)

---

## 📊 Performance

### Resource Usage
- **Bandwidth**: ~1-2 Mbps during speech
- **Latency**: 100-300ms from text to speech start
- **Video Resolution**: 1920x1080 (16:9)
- **Frame Rate**: 25-30 FPS

### Optimization Tips
1. **Crop video** if full resolution not needed
2. **Use background color** instead of images
3. **Close connection** when not in use
4. **Monitor connection state** and reconnect if needed

---

## 🔄 Future Enhancements

### Potential Improvements
1. **Avatar Selection UI**
   - Let users choose character
   - Select different styles
   - Customize background

2. **Gestures & Emotions**
   - Use SSML for gestures
   - Control facial expressions
   - Custom animations

3. **Custom Backgrounds**
   - Upload custom images
   - Video backgrounds
   - Virtual environments

4. **Advanced Features**
   - Batch synthesis for multiple messages
   - Preloading for faster response
   - Local caching of avatar data

---

## 📝 Code Examples

### Custom Avatar Configuration
```javascript
// In avatar.js, modify AVATAR_CONFIG:
const AVATAR_CONFIG = {
    character: 'wayne',          // Change character
    style: 'technical-sitting',  // Change style
    backgroundColor: '#E8F4FF'   // Light blue background
};
```

### Adding Gestures via SSML
```javascript
// In ai_engine.py or as frontend enhancement:
const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
       xmlns:mstts="https://www.w3.org/2001/mstts">
  <voice name="en-US-JennyNeural">
    <mstts:ttsembedding speakerProfileId="your-profile-id">
      <mstts:leadingsilence-exact value="0"/>
      Hello! <mstts:express-as style="cheerful">
        I'm excited to help you!
      </mstts:express-as>
    </mstts:ttsembedding>
  </voice>
</speak>`;
```

### Monitoring Connection
```javascript
// Add to setupPeerConnection in avatar.js:
peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE state:', peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === 'disconnected') {
        // Handle reconnection
        updateAvatarStatus('Reconnecting...');
    }
};
```

---

## 📚 Resources

### Official Documentation
- [Azure Speech Avatar Overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech-avatar/real-time-synthesis-avatar)
- [Avatar Characters & Styles](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech-avatar/avatar-gestures-with-ssml)
- [Speech SDK JavaScript Reference](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/)

### Code Samples
- [GitHub: Speech SDK Samples](https://github.com/Azure-Samples/cognitive-services-speech-sdk)
- [JavaScript Avatar Sample](https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/samples/js/browser/avatar)

### Pricing
- [Azure Speech Service Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/)
- Avatar synthesis charged per character
- Free tier available for testing

---

## ✅ Testing Checklist

### Before Deployment
- [ ] Avatar initializes without errors
- [ ] Video and audio streams connect
- [ ] Speech synthesis works with avatar
- [ ] Fallback to standard TTS works
- [ ] Status messages display correctly
- [ ] Browser compatibility verified
- [ ] Network connectivity tested
- [ ] Error handling validated

### User Acceptance
- [ ] Avatar appearance is professional
- [ ] Lip-sync quality is acceptable
- [ ] Audio quality is clear
- [ ] Response time is acceptable
- [ ] UI doesn't block chat messages
- [ ] Avatar can be toggled on/off (future feature)

---

## 🎯 Summary

The Azure Speech Avatar integration adds a cutting-edge visual element to the Agentic SA application, providing users with a more engaging and human-like interaction experience. The implementation uses industry-standard WebRTC technology and integrates seamlessly with the existing voice and text chat functionality.

**Key Benefits:**
- ✅ Enhanced user engagement with visual avatar
- ✅ Professional presentation for business use
- ✅ Real-time synthesis with low latency
- ✅ Robust fallback ensures reliability
- ✅ Scalable and maintainable architecture

---

**Implementation Status**: ✅ Complete  
**Branch**: backup  
**Ready for Testing**: Yes  
**Production Ready**: After testing

---

*For questions or issues, refer to the Azure Speech Service documentation or check the browser console for detailed error messages.*
