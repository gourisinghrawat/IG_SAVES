import logging
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi

from src.indexing.vector_store import LocalVectorStore
from src.preprocessor.clip_dedup import CLIPDeduplicator

logger = logging.getLogger(__name__)

class HybridSearchEngine:
    def __init__(self, vector_store: LocalVectorStore, clip_dedup: CLIPDeduplicator):
        self.vector_store = vector_store
        self.clip_dedup = clip_dedup

    def search(self, query_text: str, top_k: int = 5, k_rrf: float = 60.0) -> List[Dict[str, Any]]:
        """
        Executes hybrid search combining Dense CLIP Vector Search with Sparse BM25 Lexical Search.
        Fuses rankings using Reciprocal Rank Fusion (RRF).
        """
        # 1. Dense Vector Search
        query_vector = self.clip_dedup.encode_text(query_text)
        dense_results = self.vector_store.search_similar(query_vector, top_k=top_k * 2)

        # 2. Sparse Lexical Search (BM25)
        all_records = self.vector_store.get_all_payloads()
        sparse_results = []
        
        if all_records:
            corpus = []
            valid_records = []
            for item in all_records:
                payload = item["payload"]
                text_content = payload.get("text", "") or payload.get("description", "")
                if text_content:
                    corpus.append(text_content.lower().split())
                    valid_records.append(item)

            if corpus:
                bm25 = BM25Okapi(corpus)
                tokenized_query = query_text.lower().split()
                scores = bm25.get_scores(tokenized_query)
                
                # Pair with records and sort
                scored_records = list(zip(scores, valid_records))
                scored_records.sort(key=lambda x: x[0], reverse=True)
                sparse_results = [rec for score, rec in scored_records[:top_k * 2] if score > 0]

        # 3. Reciprocal Rank Fusion (RRF)
        rrf_scores: Dict[str, float] = {}
        items_by_id: Dict[str, Dict[str, Any]] = {}

        # Add Dense Ranks
        for rank, item in enumerate(dense_results):
            item_id = str(item["id"])
            items_by_id[item_id] = item
            rrf_scores[item_id] = rrf_scores.get(item_id, 0.0) + (1.0 / (k_rrf + rank + 1))

        # Add Sparse Ranks
        for rank, item in enumerate(sparse_results):
            item_id = str(item["id"])
            items_by_id[item_id] = item
            rrf_scores[item_id] = rrf_scores.get(item_id, 0.0) + (1.0 / (k_rrf + rank + 1))

        # Sort by final RRF score
        sorted_rrf = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        
        fused_results = []
        for item_id, score in sorted_rrf[:top_k]:
            item = items_by_id[item_id]
            item["rrf_score"] = score
            fused_results.append(item)

        logger.info(f"Hybrid search returned {len(fused_results)} results for query: '{query_text}'")
        return fused_results
