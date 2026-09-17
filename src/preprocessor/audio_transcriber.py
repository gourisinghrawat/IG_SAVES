import logging
from pathlib import Path
from typing import List, Dict, Any
from faster_whisper import WhisperModel

from config.settings import AUDIO_DIR, WHISPER_MODEL_SIZE

logger = logging.getLogger(__name__)

class AudioTranscriber:
    def __init__(self, model_size: str = WHISPER_MODEL_SIZE, device: str = None):
        """
        Initializes local faster-whisper model.
        Runs 100% locally on CPU or CUDA.
        """
        if device is None:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            
        compute_type = "float16" if device == "cuda" else "int8"
        logger.info(f"Loading faster-whisper ({model_size}) on device={device}...")
        
        # Retry mechanism for downloading HF model files safely
        import time
        max_retries = 3
        loaded = False
        
        for attempt in range(max_retries):
            try:
                self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
                loaded = True
                break
            except Exception as e:
                logger.warning(f"Whisper model download attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(3)

        if not loaded and model_size != "tiny":
            logger.info("Attempting fallback to lightweight 'tiny' model...")
            try:
                self.model = WhisperModel("tiny", device=device, compute_type=compute_type)
                loaded = True
            except Exception as e:
                logger.error(f"Failed to load fallback 'tiny' model: {e}")
                raise e


    def transcribe_video(self, video_path: str) -> List[Dict[str, Any]]:
        """
        Transcribes speech directly from a video file with timestamp segments.
        Returns a list of dictionaries with start time, end time, and text segment.
        """
        logger.info(f"Transcribing audio from video: {video_path}")
        segments, info = self.model.transcribe(video_path, beam_size=5)
        
        transcript_segments = []
        for seg in segments:
            transcript_segments.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip()
            })
            
        logger.info(f"Extracted {len(transcript_segments)} transcript segments.")
        return transcript_segments
