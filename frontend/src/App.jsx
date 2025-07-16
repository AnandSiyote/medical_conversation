import React, { useState } from 'react';
import VoiceEnrollment from './components/VoiceEnrollment';
import ConversationRecorder from './components/ConversationRecorder';
import TranscriptViewer from './components/TranscriptViewer';
import './components/ConversationRecorder.css';

function App() {
  const [enrolled, setEnrolled] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [recordingDone, setRecordingDone] = useState(false);

  if (!enrolled) {
    return <VoiceEnrollment onEnrollmentComplete={() => setEnrolled(true)} />;
  }

  if (!recordingDone) {
    return <ConversationRecorder sessionId={sessionId} onRecordingDone={() => setRecordingDone(true)} />;
  }

  return <TranscriptViewer sessionId={sessionId} />;
}

export default App; 