from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class IngestRequest(BaseModel):
    url: str = Field(..., description="Instagram Reel URL, YouTube Shorts link, or raw video URL")

class IngestResponse(BaseModel):
    status: str
    video_id: str
    total_frames: int
    unique_frames: int
    removed_frames: int
    transcripts_count: int
    webpage_url: str

class BatchIngestRequest(BaseModel):
    urls: List[str] = Field(..., description="List of Instagram Reel URLs to ingest in batch")

class BatchIngestResponse(BaseModel):
    status: str
    total_requested: int
    successful: int
    failed: int
    results: List[IngestResponse]

class SearchRequest(BaseModel):
    query: str = Field(..., description="Natural language search query")
    top_k: int = Field(5, ge=1, le=20, description="Number of results to retrieve")

class SearchResultItem(BaseModel):
    id: str
    score: float
    type: str
    video_id: str
    timestamp: Optional[float] = None
    text: Optional[str] = None
    frame_path: Optional[str] = None
    webpage_url: Optional[str] = None
    uploader: Optional[str] = "unknown"
    caption: Optional[str] = ""

class SearchResponse(BaseModel):
    query: str
    answer: str
    engine: str
    results: List[SearchResultItem]

class HealthResponse(BaseModel):
    status: str
    whisper_loaded: bool
    clip_loaded: bool
    vector_db_connected: bool
    ollama_online: bool
