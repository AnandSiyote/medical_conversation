import React, { useState } from 'react';
import './VoiceEnrollment.css';

function VoiceEnrollment({ onEnrollmentComplete }) {
  const [step, setStep] = useState('doctor');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [status, setStatus] = useState('');
  let mediaRecorder;
  let audioChunks = [];

  const startRecording = async () => {
    setRecording(true);
    setStatus('Recording...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let options = { mimeType: 'audio/webm;codecs=opus' };
    if (!window.MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'audio/webm' };
    }
    mediaRecorder = new window.MediaRecorder(stream, options);
    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: options.mimeType });
      setAudioBlob(blob);
      setRecording(false);
      setStatus('Recorded. Ready to upload.');
    };
    mediaRecorder.start(); // Record whole sample
    window._mediaRecorder = mediaRecorder;
  };

  const stopRecording = () => {
    if (window._mediaRecorder) {
      window._mediaRecorder.stop();
    }
  };

  const uploadSample = async () => {
    if (!audioBlob) return;
    setStatus('Uploading...');
    const formData = new FormData();
    formData.append('role', step);
    formData.append('audio', audioBlob, `${step}_enrollment.webm`);
    await fetch('/api/enroll_voice', {
      method: 'POST',
      body: formData,
    });
    setStatus('Uploaded!');
    setAudioBlob(null);
    if (step === 'doctor') {
      setStep('patient');
      setStatus('Now enroll Patient.');
    } else {
      setStatus('Enrollment complete!');
      onEnrollmentComplete();
    }
  };

  return (
    <div className="enroll-card">
      <h2 className="enroll-title">Voice Enrollment</h2>
      <div className="enroll-status-row">
        <span className={`enroll-status-dot ${recording ? 'recording' : 'idle'}`}></span>
        <span className="enroll-status-text">{status}</span>
      </div>
      <div className="enroll-step">Current: <strong>{step === 'doctor' ? 'Doctor' : 'Patient'}</strong></div>
      <div className="enroll-buttons">
        <button className="enroll-btn start" onClick={startRecording} disabled={recording}>🎤 Start Recording</button>
        <button className="enroll-btn stop" onClick={stopRecording} disabled={!recording}>⏹️ Stop Recording</button>
        <button className="enroll-btn upload" onClick={uploadSample} disabled={!audioBlob}>⬆️ Upload Sample</button>
      </div>
      {audioBlob && (
        <div className="enroll-audio-preview">
          <audio controls src={URL.createObjectURL(audioBlob)} />
        </div>
      )}
    </div>
  );
}

export default VoiceEnrollment; 