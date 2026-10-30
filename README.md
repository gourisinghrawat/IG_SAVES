# InstaReelRAG

InstaReelRAG is a 100% free and local multimodal Retrieval-Augmented Generation (RAG) system for Instagram Reels and short-form video content. It downloads Reels, transcribes audio speech using Faster-Whisper, extracts visual frames using OpenCV, deduplicates redundant keyframes via GPU/CPU CLIP embeddings, and indexes content into a local Qdrant vector database for hybrid semantic and keyword search.

## Features

- **100% Free and Local Execution**: Runs entirely on your local hardware with no API keys, cloud subscriptions, or paid third-party services.
- **Audio Speech Transcription**: Uses Faster-Whisper for timestamped speech-to-text transcript generation.
- **Visual Keyframe Deduplication**: Uses HuggingFace CLIP vision encoder and cosine similarity thresholding to filter redundant frames and reduce storage overhead by up to 80%.
- **Hybrid Search Engine**: Combines dense CLIP visual and text vectors with BM25 sparse keyword matching using Reciprocal Rank Fusion (RRF).
- **Chrome Extension (Manifest V3)**: Auto-scrolls saved Instagram Reel collections, extracts Reel URLs, captions, and creator handles, and sends batch ingestion requests to the local server.
- **FastAPI REST Server**: Asynchronous backend providing endpoints for health monitoring, reel ingestion, batch processing, and RAG search.
- **Next.js Modern Web Interface**: Responsive React dashboard built with Next.js App Router and Tailwind CSS for video ingestion metrics and RAG search.

## System Architecture

```
[ Instagram Web ] ---> [ Chrome Extension (Manifest V3) ]
                              |
                              v
[ User Link Input ] ---> [ FastAPI REST Backend (api.py) ]
                              |
     +------------------------+------------------------+
     |                        |                        |
     v                        v                        v
[ yt-dlp Video ]    [ Faster-Whisper Audio ]    [ OpenCV Frame Sampling ]
     |                        |                        |
     |                        v                        v
     |             [ Text Transcripts ]       [ CLIP Deduplication ]
     |                        |                        |
     +------------------------+------------------------+
                              |
                              v
                 [ Qdrant Local Vector DB ]
                              |
                              v
               [ Hybrid BM25 + CLIP Search ]
                              |
                              v
                 [ Ollama / Local Vision LLM ]
```

## Repository Structure

```
igreelrag/
├── api.py                     # FastAPI REST API Server
├── app.py                     # Streamlit Web Application
├── config/
│   └── settings.py            # Local model configuration and directory paths
├── src/
│   ├── api/
│   │   └── schemas.py         # Pydantic API data models
│   ├── downloader/
│   │   └── reel_downloader.py # Reel video and metadata downloader
│   ├── preprocessor/
│   │   ├── audio_transcriber.py # Faster-Whisper audio transcriber
│   │   ├── frame_extractor.py   # OpenCV frame sampler
│   │   └── clip_dedup.py        # GPU/CPU CLIP deduplicator
│   ├── indexing/
│   │   ├── vector_store.py    # Local Qdrant vector store
│   │   └── hybrid_search.py   # BM25 + CLIP Hybrid Search with RRF
│   └── rag/
│       └── generator.py       # Local Ollama LLM answer generator
├── frontend/                  # Next.js 14 App Router Frontend
├── extension/                 # Chrome Extension (Manifest V3)
├── requirements.txt           # Python dependencies
├── .gitignore                 # Git ignore rules
└── README.md                  # Documentation
```

## Installation

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- NVIDIA GPU (Optional, recommended for faster transcription and CLIP encoding)

### 1. Clone the Repository and Setup Virtual Environment

```bash
git clone https://github.com/your-username/InstaReelRAG.git
cd InstaReelRAG

python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Quick Start

### 1. Start the FastAPI REST Server

```bash
python api.py
```

The server will start at `http://127.0.0.1:8000`. You can access interactive Swagger API documentation at `http://127.0.0.1:8000/docs`.

### 2. Start the Next.js Frontend

In a second terminal window:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your web browser.

### 3. Load the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` directory inside this repository.
4. Navigate to Instagram (`https://www.instagram.com/saved/`), open the extension popup, and click **Start Auto-Scroll & Scrape**.

## Cloud Deployment

### 1. Frontend on Vercel (Next.js)

1. Import your GitHub repository into Vercel (https://vercel.com/new).
2. In Project Settings, set **Root Directory** to `frontend`.
3. Under **Environment Variables**, optionally set:
   - `NEXT_PUBLIC_API_BASE_URL`: Defaults to `http://127.0.0.1:8000`, or set to your default cloud backend endpoint.
4. Click **Deploy**. Vercel will build and host your web application.

### 2. Connecting Vercel to a Local Backend via Tunnel Link

When your frontend is hosted on Vercel (`https://...`), web browsers block direct unencrypted `http://localhost` calls due to Mixed Content security rules. You can connect your Vercel deployment to your local machine using a free HTTPS tunnel:

1. Start your local backend:
   ```bash
   python api.py
   ```
2. Start an HTTPS tunnel in another terminal (choose any):
   - **Cloudflare Tunnel (Free, No Sign-up)**:
     ```bash
     cloudflared tunnel --url http://localhost:8000
     ```
   - **ngrok (Free)**:
     ```bash
     ngrok http 8000
     ```
   - **Localtunnel (Free via npx)**:
     ```bash
     npx localtunnel --port 8000
     ```
   - **Pinggy (SSH one-liner, no installation)**:
     ```bash
     ssh -p 443 -R0:localhost:8000 a.pinggy.io
     ```
3. Open your Vercel web app, click the **Backend: API** status pill in the navbar, paste your HTTPS tunnel link, and click **Save & Connect URL**. The setting is automatically saved to your browser's local storage and used for all searches, ingestions, and health checks.


## License

This project is licensed under the MIT License.
