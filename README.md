# Medical Conversation App

## Overview
This folder contains all relevant code and assets for the Medical Conversation App, which enables real-time recording, transcription, and speaker identification for Doctor-Patient conversations.

## Folder Structure
```
medical_conversation/
  backend/
    api/
      audio.py
    main.py
    requirements.txt
    services/
      audio_processing.py
      patient_service.py
      summarizer.py
    db/
      models.py
      schema.sql
      seed_data.py
  frontend/
    package.json
    src/
      App.jsx
      index.js
      components/
        ConversationRecorder.jsx
        ConversationRecorder.css
        VoiceEnrollment.jsx
        VoiceEnrollment.css
        TranscriptViewer.jsx
        SummaryPanel.jsx
        PatientHistoryPanel.jsx
        RealTimeTranscript.jsx
        ChatbotWithMic.jsx
  README.md
```

## Tech Stack
- **Frontend:** React.js, CSS Modules
- **Backend:** FastAPI (Python), OpenAI Whisper, pyannote-audio, FFmpeg

## General Flow
1. **Voice Enrollment:** Doctor and Patient record short samples for speaker identification.
2. **Conversation Recording:** The entire conversation is recorded in-browser and uploaded.
3. **Processing:** Backend transcribes and labels each segment using AI models.
4. **Transcript Review:** User sees a labeled transcript with audio playback for each segment.

## Setup Instructions
1. **Backend:**
   - Install dependencies: `pip install -r requirements.txt`
   - Run: `uvicorn main:app --reload`
2. **Frontend:**
   - Install dependencies: `npm install`
   - Run: `npm start`
