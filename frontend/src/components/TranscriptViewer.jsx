import React, { useEffect, useState, useRef } from 'react';

function TranscriptViewer({ sessionId }) {
  const [transcript, setTranscript] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const maxPolls = 15; // 15 polls x 2s = 30s max
  const pollInterval = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchTranscript() {
      setLoading(true);
      console.log('Fetching transcript for sessionId:', sessionId); // Debug log
      const res = await fetch(`/api/session_transcript/${sessionId}`);
      const data = await res.json();
      console.log('Fetched transcript data:', data); // Debug log
      if (!isMounted) return;
      setTranscript(data);
      setLoading(false);

      // If transcript is empty, poll again (up to maxPolls)
      if ((!data || !data.length) && pollCount < maxPolls) {
        pollInterval.current = setTimeout(() => setPollCount(c => c + 1), 2000);
      }
    }
    fetchTranscript();
    return () => {
      isMounted = false;
      if (pollInterval.current) clearTimeout(pollInterval.current);
    };
  }, [sessionId, pollCount]);

  if (loading) return <div>Loading transcript...</div>;
  if (!transcript.length) return <div>Processing transcript, please wait...</div>;

  return (
    <div>
      <h2>Session Transcript</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {transcript.map((entry, idx) => (
          <li key={idx} style={{ marginBottom: '1em', background: '#f9f9f9', padding: '1em', borderRadius: '8px' }}>
            <strong>{entry.speaker}:</strong>
            <span style={{ marginLeft: 8 }}>{entry.transcript}</span>
            <br />
            <audio controls src={`/${entry.filename.replace(/\\/g, '/')}`} style={{ marginTop: 8 }} />
            <div style={{ fontSize: '0.8em', color: '#888' }}>Timestamp: {new Date(Number(entry.timestamp)).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TranscriptViewer; 