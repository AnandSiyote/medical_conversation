import React, { useRef, useState } from 'react';
import './ConversationRecorder.css';

function ConversationRecorder({ sessionId, onRecordingDone }) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  const startRecording = async () => {
    setRecording(true);
    setStatus('Recording...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let options = { mimeType: 'audio/webm;codecs=opus' };
    if (!window.MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'audio/webm' };
    }
    const mediaRecorder = new window.MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      setRecording(false);
      setStatus('Stopped.');
      const blob = new Blob(audioChunksRef.current, { type: options.mimeType });
      // Upload the whole file after stop
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('audio', blob, `conversation_${Date.now()}.webm`);
      formData.append('timestamp', Date.now());
      await fetch('/api/upload_chunk', {
        method: 'POST',
        body: formData,
      });
      if (onRecordingDone) onRecordingDone();
    };

    mediaRecorder.start(); // Record whole session

    // Live transcription (optional)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setTranscript((prev) => prev + event.results[i][0].transcript + ' ');
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setStatus('Recording... ' + interim);
      };
      recognition.start();
      recognitionRef.current = recognition;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setRecording(false);
    setStatus('Stopped.');
    if (onRecordingDone) onRecordingDone();
  };

  return (
    <div className="recorder-card">
      <h2 className="recorder-title">Conversation Recorder</h2>
      <div className="recorder-status-row">
        <span className={`recorder-status-dot ${recording ? 'recording' : 'idle'}`}></span>
        <span className="recorder-status-text">{status}</span>
      </div>
      <div className="recorder-buttons">
        <button className="recorder-btn start" onClick={startRecording} disabled={recording}>
          <span role="img" aria-label="mic">🎤</span> Start Recording
        </button>
        <button className="recorder-btn stop" onClick={stopRecording} disabled={!recording}>
          <span role="img" aria-label="stop">⏹️</span> Stop Recording
        </button>
      </div>
      <div className="recorder-transcript-box">
        <strong>Transcript:</strong>
        <div className="recorder-transcript-content">{transcript}</div>
      </div>
    </div>
  );
}

export default ConversationRecorder; 