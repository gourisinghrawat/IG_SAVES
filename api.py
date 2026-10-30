import logging
from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from config.settings import WHISPER_MODEL_SIZE
from src.downloader.reel_downloader import ReelDownloader, get_reel_metadata
from src.preprocessor.audio_transcriber import AudioTranscriber
from src.preprocessor.frame_extractor import FrameExtractor
from src.preprocessor.clip_dedup import CLIPDeduplicator
from src.indexing.vector_store import LocalVectorStore
from src.indexing.hybrid_search import HybridSearchEngine
from src.rag.generator import LocalRAGGenerator
from src.api.schemas import IngestRequest, IngestResponse, BatchIngestRequest, BatchIngestResponse, SearchRequest, SearchResponse, SearchResultItem, HealthResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("InstaReelRAG-API")

# Global pipeline container
pipeline: Dict[str, Any] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing InstaReelRAG AI Engine Pipeline...")
    pipeline["downloader"] = ReelDownloader()
    pipeline["transcriber"] = AudioTranscriber(model_size=WHISPER_MODEL_SIZE)
    pipeline["extractor"] = FrameExtractor()
    pipeline["deduplicator"] = CLIPDeduplicator()
    pipeline["vector_store"] = LocalVectorStore()
    pipeline["search_engine"] = HybridSearchEngine(pipeline["vector_store"], pipeline["deduplicator"])
    pipeline["generator"] = LocalRAGGenerator()
    logger.info("Pipeline Ready!")
    yield
    pipeline.clear()

app = FastAPI(
    title="InstaReelRAG Local API Backend",
    description="REST API for Multimodal Instagram Reel Downloading, CLIP Deduplication, Hybrid Vector Indexing, and RAG Querying",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Streamlit / Web Clients / Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
def root():
    return {
        "name": "InstaReelRAG API",
        "status": "online",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    return HealthResponse(
        status="ok",
        whisper_loaded="transcriber" in pipeline,
        clip_loaded="deduplicator" in pipeline,
        vector_db_connected="vector_store" in pipeline,
        ollama_online=pipeline["generator"].is_ollama_available() if "generator" in pipeline else False
    )

@app.post("/api/v1/ingest", response_model=IngestResponse, tags=["Ingestion"])
def ingest_reel(req: IngestRequest):
    """
    Downloads reel, transcribes audio, extracts frames, deduplicates via GPU CLIP, and indexes into Qdrant.
    """
    if not req.url:
        raise HTTPException(status_code=400, detail="URL cannot be empty.")
    
    try:
        logger.info(f"Ingesting URL: {req.url}")
        res = pipeline["downloader"].download(req.url)
        video_id = res["video_id"]
        video_path = res["video_path"]
        webpage_url = res["metadata"].get("webpage_url", req.url)
        uploader = res["metadata"].get("uploader", "unknown")
        caption = res["metadata"].get("description") or res["metadata"].get("title", "")

        transcripts = pipeline["transcriber"].transcribe_video(video_path)
        raw_frames = pipeline["extractor"].extract_frames(video_path, video_id, sample_interval_sec=1.0)
        unique_frames, dedup_stats = pipeline["deduplicator"].deduplicate(raw_frames)

        pipeline["vector_store"].upsert_frames(unique_frames, video_id, webpage_url=webpage_url, uploader=uploader, caption=caption)
        pipeline["vector_store"].upsert_transcripts(transcripts, pipeline["deduplicator"], video_id, webpage_url=webpage_url, uploader=uploader, caption=caption)

        return IngestResponse(
            status="success",
            video_id=video_id,
            total_frames=dedup_stats["total"],
            unique_frames=dedup_stats["unique"],
            removed_frames=dedup_stats["removed"],
            transcripts_count=len(transcripts),
            webpage_url=webpage_url
        )
    except Exception as e:
        logger.error(f"Ingestion failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ingest/batch", response_model=BatchIngestResponse, tags=["Ingestion"])
def batch_ingest_reels(req: BatchIngestRequest):
    """
    Batch ingests a list of Reel URLs collected by Chrome Extension.
    """
    if not req.urls:
        raise HTTPException(status_code=400, detail="URL list cannot be empty.")

    results = []
    successful = 0
    failed = 0

    for url in req.urls:
        try:
            ingest_res = ingest_reel(IngestRequest(url=url))
            results.append(ingest_res)
            successful += 1
        except Exception as e:
            logger.error(f"Failed batch item {url}: {e}")
            failed += 1

    return BatchIngestResponse(
        status="completed",
        total_requested=len(req.urls),
        successful=successful,
        failed=failed,
        results=results
    )

@app.post("/api/v1/search", response_model=SearchResponse, tags=["RAG Search"])
def search_reel(req: SearchRequest):
    """
    Performs hybrid BM25 + CLIP vector search with RRF fusion and generates RAG response.
    """
    if not req.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        results = pipeline["search_engine"].search(req.query, top_k=req.top_k)
        rag_out = pipeline["generator"].generate_answer(req.query, results)

        parsed_results = []
        for r in results:
            payload = r.get("payload", {})
            video_id = payload.get("video_id", "unknown")
            webpage_url = payload.get("webpage_url", "")
            uploader = payload.get("uploader")
            caption = payload.get("caption")

            # Dynamic fallback extraction from URL or saved metadata files
            if not uploader or uploader == "unknown" or not caption:
                meta = get_reel_metadata(video_id, webpage_url)
                if not uploader or uploader == "unknown":
                    uploader = meta["uploader"]
                if not caption:
                    caption = meta["caption"]

            parsed_results.append(SearchResultItem(
                id=str(r.get("id")),
                score=round(r.get("rrf_score", 0), 4),
                type=payload.get("type", "unknown"),
                video_id=video_id,
                timestamp=payload.get("timestamp_start") or payload.get("timestamp"),
                text=payload.get("text"),
                frame_path=payload.get("frame_path"),
                webpage_url=webpage_url,
                uploader=uploader if uploader else "unknown",
                caption=caption if caption else ""
            ))

        return SearchResponse(
            query=req.query,
            answer=rag_out["answer"],
            engine=rag_out["engine"],
            results=parsed_results
        )
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)

