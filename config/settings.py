import os
from pathlib import Path

# Base Directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Data Directories
DATA_DIR = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
RAW_REELS_DIR = DATA_DIR / "raw_reels"
AUDIO_DIR = DATA_DIR / "audio"
KEYFRAMES_DIR = DATA_DIR / "keyframes"
QDRANT_DIR = DATA_DIR / "qdrant_db"

# Create directories if they do not exist
for directory in [DATA_DIR, RAW_REELS_DIR, AUDIO_DIR, KEYFRAMES_DIR, QDRANT_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Model Settings (100% Free & Local)
CLIP_MODEL_NAME = os.getenv("CLIP_MODEL_NAME", "openai/clip-vit-base-patch32")
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")  # tiny, base, small, medium, large-v3
CLIP_DEDUP_THRESHOLD = float(os.getenv("CLIP_DEDUP_THRESHOLD", "0.92"))

# Local Ollama Settings
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "qwen2-vl") # qwen2-vl, llama3.2-vision, moondream

# Qdrant Collection Settings
COLLECTION_NAME = "instareel_multimodal"
VECTOR_SIZE = 512  # CLIP vit-base-patch32 output size
