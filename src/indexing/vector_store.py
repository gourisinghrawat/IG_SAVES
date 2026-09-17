import logging
import uuid
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

from config.settings import QDRANT_DIR, COLLECTION_NAME, VECTOR_SIZE

logger = logging.getLogger(__name__)

class LocalVectorStore:
    def __init__(self, db_path: str = str(QDRANT_DIR), collection_name: str = COLLECTION_NAME):
        """
        Initializes 100% local Qdrant Vector Database persisted to local disk storage.
        """
        self.collection_name = collection_name
        logger.info(f"Initializing Local Qdrant Store at {db_path}...")
        self.client = QdrantClient(path=db_path)
        self._ensure_collection()

    def _ensure_collection(self):
        """
        Ensures the multimodal Qdrant collection exists with Cosine distance metric.
        """
        collections = [c.name for c in self.client.get_collections().collections]
        if self.collection_name not in collections:
            logger.info(f"Creating collection '{self.collection_name}' with vector size {VECTOR_SIZE}...")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
            )

    def upsert_frames(self, frames: List[Dict[str, Any]], video_id: str, webpage_url: str = "", uploader: str = "unknown", caption: str = ""):
        """
        Stores keyframe embeddings and payload metadata into Qdrant.
        """
        points = []
        for frame in frames:
            if "embedding" not in frame:
                continue
            point_id = str(uuid.uuid4())
            payload = {
                "video_id": video_id,
                "timestamp": frame["timestamp"],
                "frame_path": frame["frame_path"],
                "type": "frame",
                "webpage_url": webpage_url,
                "uploader": uploader,
                "caption": caption
            }
            points.append(PointStruct(
                id=point_id,
                vector=frame["embedding"],
                payload=payload
            ))

        if points:
            self.client.upsert(collection_name=self.collection_name, points=points)
            logger.info(f"Indexed {len(points)} keyframe vectors for video {video_id}")

    def upsert_transcripts(self, transcripts: List[Dict[str, Any]], clip_dedup, video_id: str, webpage_url: str = "", uploader: str = "unknown", caption: str = ""):
        """
        Encodes transcript text segments using CLIP text encoder and stores vectors in Qdrant.
        """
        points = []
        for seg in transcripts:
            text = seg["text"]
            if not text:
                continue
            vec = clip_dedup.encode_text(text)
            point_id = str(uuid.uuid4())
            payload = {
                "video_id": video_id,
                "timestamp_start": seg["start"],
                "timestamp_end": seg["end"],
                "text": text,
                "type": "transcript",
                "webpage_url": webpage_url,
                "uploader": uploader,
                "caption": caption
            }
            points.append(PointStruct(
                id=point_id,
                vector=vec,
                payload=payload
            ))

        if points:
            self.client.upsert(collection_name=self.collection_name, points=points)
            logger.info(f"Indexed {len(points)} transcript text vectors for video {video_id}")

    def search_similar(self, query_vector: List[float], top_k: int = 5, item_type: str = None) -> List[Dict[str, Any]]:
        """
        Performs vector similarity search in local Qdrant database.
        """
        query_filter = None
        if item_type:
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="type",
                        match=MatchValue(value=item_type)
                    )
                ]
            )

        if hasattr(self.client, "query_points"):
            response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=top_k
            )
            results = response.points
        elif hasattr(self.client, "search"):
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k
            )
        else:
            # Fallback to search_points if present
            results = self.client.search_points(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k
            )

        output = []
        for res in results:
            output.append({
                "id": res.id,
                "score": res.score,
                "payload": res.payload
            })
        return output

    def get_all_payloads(self) -> List[Dict[str, Any]]:
        """
        Retrieves all payloads for sparse BM25 indexing.
        """
        # Scroll through collection
        records, _ = self.client.scroll(
            collection_name=self.collection_name,
            limit=10000,
            with_payload=True,
            with_vectors=False
        )
        return [{"id": r.id, "payload": r.payload} for r in records]
