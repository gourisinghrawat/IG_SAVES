import os
import requests
import streamlit as st
from PIL import Image

from config.settings import RAW_REELS_DIR, WHISPER_MODEL_SIZE
from src.downloader.reel_downloader import ReelDownloader
from src.preprocessor.audio_transcriber import AudioTranscriber
from src.preprocessor.frame_extractor import FrameExtractor
from src.preprocessor.clip_dedup import CLIPDeduplicator
from src.indexing.vector_store import LocalVectorStore
from src.indexing.hybrid_search import HybridSearchEngine
from src.rag.generator import LocalRAGGenerator

FASTAPI_URL = os.getenv("FASTAPI_URL", "http://127.0.0.1:8000")

# Page Config
st.set_page_config(
    page_title="InstaReelRAG - Multimodal Search",
    page_icon="🎬",
    layout="wide"
)

st.title("🎬 InstaReelRAG (100% Free & Local)")
st.caption("Multimodal Instagram Reel RAG powered by FastAPI Backend, Faster-Whisper, GPU CLIP & Qdrant")

def check_fastapi_backend() -> bool:
    for target in [FASTAPI_URL, "http://127.0.0.1:8000", "http://localhost:8000"]:
        try:
            res = requests.get(f"{target}/health", timeout=3)
            if res.status_code == 200:
                return True
        except Exception:
            pass
    return False

use_api = check_fastapi_backend()

# Fallback direct pipeline for standalone mode
@st.cache_resource
def get_direct_pipeline():
    downloader = ReelDownloader()
    transcriber = AudioTranscriber(model_size=WHISPER_MODEL_SIZE)
    extractor = FrameExtractor()
    deduplicator = CLIPDeduplicator()
    vector_store = LocalVectorStore()
    search_engine = HybridSearchEngine(vector_store, deduplicator)
    generator = LocalRAGGenerator()
    return downloader, transcriber, extractor, deduplicator, vector_store, search_engine, generator

if not use_api:
    try:
        with st.spinner("FastAPI Server offline. Loading local in-process models..."):
            downloader, transcriber, extractor, deduplicator, vector_store, search_engine, generator = get_direct_pipeline()
    except Exception as e:
        if "already accessed by another instance" in str(e) or "already accessed" in str(e):
            st.error("⚠️ **Database Lock Conflict**: The FastAPI backend (`python api.py`) is running and holding the database lock. Please wait 5 seconds and refresh this page, or stop `python api.py` if you want standalone mode.")
            st.stop()
        else:
            raise e

# Sidebar Status
st.sidebar.header("⚙️ System Status")
if use_api:
    st.sidebar.success(f"🌐 FastAPI Backend: Online ({FASTAPI_URL})")
else:
    st.sidebar.info("💻 Mode: In-Process Standalone")
    st.sidebar.caption("Run `uvicorn api.py --reload` to launch FastAPI backend server.")

st.sidebar.success("✅ Faster-Whisper: Ready")
st.sidebar.success("✅ HuggingFace CLIP: Ready")
st.sidebar.success("✅ Qdrant DB: Persisted (Local Disk)")

tab1, tab2 = st.tabs(["📥 Ingest Reel", "🔍 Search & RAG Chat"])

# ---------------------------------------------------------
# TAB 1: INGEST REEL
# ---------------------------------------------------------
with tab1:
    st.subheader("Ingest Instagram Reel or Video URL")
    reel_url = st.text_input("Enter Instagram Reel URL or Video Link:", placeholder="https://www.instagram.com/reel/...")
    
    if st.button("🚀 Process & Index Reel", type="primary"):
        if not reel_url:
            st.error("Please enter a valid URL.")
        else:
            with st.status("Processing Multimodal Reel Pipeline...", expanded=True) as status:
                if use_api:
                    st.write("🌐 Sending Request to FastAPI Backend (`POST /api/v1/ingest`)...")
                    try:
                        resp = requests.post(f"{FASTAPI_URL}/api/v1/ingest", json={"url": reel_url}, timeout=300)
                        if resp.status_code == 200:
                            data = resp.json()
                            status.update(label="✅ Ingestion Completed via FastAPI Backend!", state="complete")
                            
                            st.subheader("📊 Ingestion Metrics")
                            c1, c2, c3, c4 = st.columns(4)
                            c1.metric("Raw Frames", data["total_frames"])
                            c2.metric("Unique Frames", data["unique_frames"])
                            c3.metric("Redundant Frames Removed", data["removed_frames"])
                            c4.metric("Audio Transcripts", data["transcripts_count"])
                        else:
                            status.update(label="❌ FastAPI Error", state="error")
                            st.error(resp.json().get("detail", "Failed to ingest reel."))
                    except Exception as e:
                        status.update(label="❌ API Connection Error", state="error")
                        st.error(str(e))
                else:
                    # In-process direct execution
                    st.write("📥 Downloading video & metadata via yt-dlp...")
                    res = downloader.download(reel_url)
                    video_id = res["video_id"]
                    video_path = res["video_path"]
                    webpage_url = res["metadata"].get("webpage_url", reel_url)
                    
                    st.write("🎙️ Transcribing audio speech with Faster-Whisper...")
                    transcripts = transcriber.transcribe_video(video_path)
                    
                    st.write("🖼️ Sampling video frames at 1 fps...")
                    raw_frames = extractor.extract_frames(video_path, video_id, sample_interval_sec=1.0)
                    
                    st.write("⚡ Computing CLIP visual embeddings & deduplicating frames...")
                    unique_frames, dedup_stats = deduplicator.deduplicate(raw_frames)
                    
                    st.write("💾 Indexing vectors into local Qdrant Vector Store...")
                    vector_store.upsert_frames(unique_frames, video_id, webpage_url=webpage_url)
                    vector_store.upsert_transcripts(transcripts, deduplicator, video_id, webpage_url=webpage_url)
                    
                    status.update(label="✅ Reel Processed & Indexed Successfully!", state="complete")
                    
                    st.subheader("📊 Ingestion Metrics")
                    c1, c2, c3, c4 = st.columns(4)
                    c1.metric("Raw Frames", dedup_stats["total"])
                    c2.metric("Unique Frames", dedup_stats["unique"])
                    c3.metric("Redundant Frames Removed", dedup_stats["removed"])
                    c4.metric("Audio Transcripts", len(transcripts))

# ---------------------------------------------------------
# TAB 2: SEARCH & RAG CHAT
# ---------------------------------------------------------
with tab2:
    st.subheader("Multimodal Hybrid Query")
    query = st.text_input("Ask a question about your indexed Reels:", placeholder="e.g. Find reels showing quick dinner recipes or keyboard builds")
    
    if st.button("🔎 Search & Generate Answer"):
        if not query:
            st.warning("Please enter a search query.")
        else:
            with st.spinner("Running Hybrid BM25 + CLIP Search & RAG Generation..."):
                if use_api:
                    try:
                        resp = requests.post(f"{FASTAPI_URL}/api/v1/search", json={"query": query, "top_k": 5}, timeout=60)
                        if resp.status_code == 200:
                            data = resp.json()
                            st.markdown("### 🤖 Answer")
                            st.info(data["answer"])
                            st.caption(f"Engine: {data['engine']}")

                            st.markdown("### 📌 Retrieved Multimodal Evidence & Timestamps")
                            for item in data["results"]:
                                score = item["score"]
                                item_type = item["type"]
                                v_id = item["video_id"]
                                uploader = item.get("uploader", "unknown")
                                caption = item.get("caption", "")
                                
                                title_str = f"[{item_type.upper()}] Reel {v_id}"
                                if uploader and uploader != "unknown":
                                    title_str += f" (@{uploader})"
                                title_str += f" | Score: {score}"

                                with st.expander(title_str):
                                    if uploader and uploader != "unknown":
                                        st.markdown(f"**Creator**: `@{uploader}`")
                                    if caption:
                                        st.markdown(f"**Caption**: *\"{caption}\"*")
                                    if item_type == "transcript":
                                        st.write(f"**Speech Text**: \"{item.get('text')}\"")
                                        st.write(f"**Timestamp**: {item.get('timestamp')}s")
                                    elif item_type == "frame":
                                        st.write(f"**Timestamp**: {item.get('timestamp')}s")
                                        frame_p = item.get("frame_path")
                                        if frame_p and os.path.exists(frame_p):
                                            st.image(frame_p, width=300)
                                    if item.get("webpage_url"):
                                        st.markdown(f"[🔗 View Original Reel]({item.get('webpage_url')})")
                        else:
                            st.error(resp.json().get("detail", "Search failed."))
                    except Exception as e:
                        st.error(str(e))
                else:
                    results = search_engine.search(query, top_k=5)
                    rag_out = generator.generate_answer(query, results)

                    st.markdown("### 🤖 Answer")
                    st.info(rag_out["answer"])
                    st.caption(f"Engine: {rag_out['engine']}")

                    st.markdown("### 📌 Retrieved Multimodal Evidence & Timestamps")
                    for item in results:
                        payload = item.get("payload", {})
                        score = round(item.get("rrf_score", 0), 4)
                        item_type = payload.get("type", "unknown")
                        v_id = payload.get("video_id", "unknown")
                        uploader = payload.get("uploader", "unknown")
                        caption = payload.get("caption", "")

                        title_str = f"[{item_type.upper()}] Reel {v_id}"
                        if uploader and uploader != "unknown":
                            title_str += f" (@{uploader})"
                        title_str += f" | Score: {score}"
                        
                        with st.expander(title_str):
                            if uploader and uploader != "unknown":
                                st.markdown(f"**Creator**: `@{uploader}`")
                            if caption:
                                st.markdown(f"**Caption**: *\"{caption}\"*")
                            if item_type == "transcript":
                                st.write(f"**Speech Text**: \"{payload.get('text')}\"")
                                st.write(f"**Timestamp**: {payload.get('timestamp_start')}s - {payload.get('timestamp_end')}s")
                            elif item_type == "frame":
                                st.write(f"**Timestamp**: {payload.get('timestamp')}s")
                                frame_p = payload.get("frame_path")
                                if frame_p and os.path.exists(frame_p):
                                    st.image(frame_p, width=300)
                            if payload.get("webpage_url"):
                                st.markdown(f"[🔗 View Original Reel]({payload.get('webpage_url')})")
