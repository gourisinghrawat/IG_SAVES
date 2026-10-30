FROM python:3.10-slim

# Install system dependencies (ffmpeg is required for yt-dlp and faster-whisper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requirement: run as non-root user with UID 1000
RUN useradd -m -u 1000 user

WORKDIR /home/user/app

# Set environment variables
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    HF_HOME=/home/user/.cache/huggingface \
    TORCH_HOME=/home/user/.cache/torch

# Copy requirements file
COPY --chown=user:user requirements.txt .

# Install CPU PyTorch first (drastically reduces image size & build time on free CPU Spaces)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY --chown=user:user . .

# Ensure data directories exist and are owned by user 1000
RUN mkdir -p /home/user/app/data/raw_reels \
             /home/user/app/data/audio \
             /home/user/app/data/keyframes \
             /home/user/app/data/qdrant_db && \
    chown -R user:user /home/user/app

# Switch to non-root user
USER user

# Hugging Face Spaces standard port
EXPOSE 7860

# Start FastAPI application
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
