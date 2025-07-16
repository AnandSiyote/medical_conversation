from fastapi import APIRouter, UploadFile, File, Form
from pathlib import Path
import shutil
import whisper
import numpy as np
import soundfile as sf
from pyannote.audio import Model, Inference
import json
import os
import ffmpeg

router = APIRouter()

ENROLL_DIR = Path("uploads/enrollments")
ENROLL_DIR.mkdir(parents=True, exist_ok=True)

# Load Whisper model (small, for CPU)
whisper_model = whisper.load_model('small')

# Load pyannote speaker embedding model
# HF_TOKEN = os.getenv("HF_TOKEN")  # Or paste your token directly for testing
HF_TOKEN = "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"


embedding_model = Model.from_pretrained("pyannote/embedding", use_auth_token=HF_TOKEN)
speaker_inference = Inference(embedding_model, window="whole")

def get_embedding(audio_path):
    waveform, sample_rate = sf.read(audio_path)
    # Ensure waveform is 2D: (channels, time)
    if waveform.ndim == 1:
        waveform = np.expand_dims(waveform, axis=0)  # (1, time)
    elif waveform.ndim == 2 and waveform.shape[1] < waveform.shape[0]:
        waveform = waveform.T  # (channels, time)
    import torch
    waveform = torch.from_numpy(waveform).float()
    return speaker_inference({'waveform': waveform, 'sample_rate': sample_rate})

def compare_embeddings(embedding, enrolled):
    # Cosine similarity
    return np.dot(embedding, enrolled) / (np.linalg.norm(embedding) * np.linalg.norm(enrolled))

@router.post("/api/enroll_voice")
def enroll_voice(role: str = Form(...), audio: UploadFile = File(...)):
    # Save the uploaded audio file
    file_path = ENROLL_DIR / f"{role}_enrollment.webm"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    # Store metadata as needed (could be extended to DB)
    return {"status": "success", "role": role, "filename": str(file_path)}

@router.post("/api/upload_chunk")
def upload_chunk(session_id: str = Form(...), audio: UploadFile = File(...), timestamp: str = Form(...)):
    session_dir = Path(f"uploads/sessions/{session_id}")
    session_dir.mkdir(parents=True, exist_ok=True)
    file_path = session_dir / f"chunk_{timestamp}.webm"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    # Ensure the file is closed before proceeding
    import time
    time.sleep(0.1)  # Small delay to ensure file system flush (optional, for debugging)

    # Print file size for debugging
    print(f"Saved file {file_path} size: {file_path.stat().st_size} bytes")

    # Print first 16 bytes for debugging
    with open(file_path, "rb") as f:
        header_bytes = f.read(16)
        print(f"First 16 bytes: {header_bytes.hex()}")

    # Minimum file size check (e.g., 4 KB)
    min_size = 4096
    if file_path.stat().st_size < min_size:
        print(f"File {file_path} too small to be valid webm. Skipping processing.")
        return {"status": "error", "reason": "File too small to be valid webm.", "filename": str(file_path)}

    # Convert webm to wav for processing
    wav_path = file_path.with_suffix('.wav')
    # Remove existing .wav file if present
    if wav_path.exists():
        os.remove(wav_path)

    try:
        ffmpeg.input(str(file_path)).output(str(wav_path), ac=1, ar=16000).run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
    except ffmpeg.Error as e:
        print('ffmpeg error:', e.stderr.decode())
        raise

    # Transcribe with Whisper
    result = whisper_model.transcribe(str(wav_path), fp16=False)
    transcript = result['text']

    # Speaker embedding for chunk
    chunk_embedding = get_embedding(str(wav_path))

    # Load enrolled embeddings
    enroll_dir = Path("uploads/enrollments")
    doctor_wav = enroll_dir / "doctor_enrollment.wav"
    patient_wav = enroll_dir / "patient_enrollment.wav"
    # Convert enrollment webm to wav if needed
    for role in ["doctor", "patient"]:
        webm = enroll_dir / f"{role}_enrollment.webm"
        wav = enroll_dir / f"{role}_enrollment.wav"
        if webm.exists() and not wav.exists():
            ffmpeg.input(str(webm)).output(str(wav), ac=1, ar=16000).run(overwrite_output=True, quiet=True)
    doctor_embedding = get_embedding(str(doctor_wav)) if doctor_wav.exists() else None
    patient_embedding = get_embedding(str(patient_wav)) if patient_wav.exists() else None

    # Compare and assign speaker
    speaker = "Unknown"
    if doctor_embedding is not None and patient_embedding is not None:
        sim_doc = compare_embeddings(chunk_embedding, doctor_embedding)
        sim_pat = compare_embeddings(chunk_embedding, patient_embedding)
        speaker = "Doctor" if sim_doc > sim_pat else "Patient"

    # Store result in session transcript JSON
    transcript_path = session_dir / "transcript.json"
    entry = {
        "timestamp": timestamp,
        "filename": str(file_path),
        "transcript": transcript,
        "speaker": speaker
    }
    if transcript_path.exists():
        with open(transcript_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = []
    data.append(entry)
    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    return {"status": "success", "session_id": session_id, "filename": str(file_path), "transcript": transcript, "speaker": speaker}

@router.get("/api/session_transcript/{session_id}")
def get_session_transcript(session_id: str):
    session_dir = Path(f"uploads/sessions/{session_id}")
    transcript_path = session_dir / "transcript.json"
    if transcript_path.exists():
        with open(transcript_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    return [] 