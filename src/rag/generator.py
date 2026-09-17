import logging
import json
import requests
from typing import List, Dict, Any, Optional

from config.settings import OLLAMA_URL, OLLAMA_VISION_MODEL

logger = logging.getLogger(__name__)

class LocalRAGGenerator:
    def __init__(self, ollama_url: str = OLLAMA_URL, model_name: str = OLLAMA_VISION_MODEL):
        self.ollama_url = ollama_url
        self.model_name = model_name

    def is_ollama_available(self) -> bool:
        """Checks if local Ollama service is running."""
        try:
            res = requests.get(f"{self.ollama_url}/api/tags", timeout=2)
            return res.status_code == 200
        except Exception:
            return False

    def generate_answer(self, query: str, context_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates a grounded RAG response with video timestamps.
        Runs locally via Ollama if running, or formats clean context response.
        """
        context_str = ""
        timestamps = []
        video_links = set()

        for idx, item in enumerate(context_items):
            payload = item.get("payload", {})
            item_type = payload.get("type", "unknown")
            v_id = payload.get("video_id", "unknown")
            url = payload.get("webpage_url", "")
            if url:
                video_links.add(url)

            if item_type == "transcript":
                start_t = payload.get("timestamp_start", 0)
                end_t = payload.get("timestamp_end", 0)
                text = payload.get("text", "")
                context_str += f"- [Audio {start_t}s - {end_t}s] (Reel {v_id}): \"{text}\"\n"
                timestamps.append({"reel": v_id, "timestamp": start_t, "text": text, "url": url})
            elif item_type == "frame":
                t = payload.get("timestamp", 0)
                frame_path = payload.get("frame_path", "")
                context_str += f"- [Visual Frame at {t}s] (Reel {v_id}, file: {frame_path})\n"
                timestamps.append({"reel": v_id, "timestamp": t, "frame_path": frame_path, "url": url})

        system_prompt = (
            "You are InstaReelRAG, a helpful multimodal assistant. "
            "Answer the user's question using ONLY the provided transcript clips and visual frame timestamps from Instagram Reels. "
            "Always include the exact timestamp (in seconds) and video reference when citing information."
        )

        user_prompt = f"User Question: {query}\n\nRetrieved Context:\n{context_str}\n\nAnswer:"

        if self.is_ollama_available():
            try:
                logger.info(f"Calling local Ollama LLM model: {self.model_name}...")
                response = requests.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "system": system_prompt,
                        "prompt": user_prompt,
                        "stream": False
                    },
                    timeout=30
                )
                if response.status_code == 200:
                    answer_text = response.json().get("response", "").strip()
                    return {
                        "answer": answer_text,
                        "context_used": context_str,
                        "timestamps": timestamps,
                        "video_links": list(video_links),
                        "engine": f"Ollama ({self.model_name})"
                    }
            except Exception as e:
                logger.warning(f"Ollama call failed: {e}. Falling back to structured response.")

        # Fallback local response format if Ollama service is offline
        fallback_answer = (
            f"Based on the retrieved reel clips for **'{query}'**:\n\n"
            f"{context_str}\n"
            f"*Note: Install & launch Ollama (`ollama run {self.model_name}`) for full natural language synthesis.*"
        )

        return {
            "answer": fallback_answer,
            "context_used": context_str,
            "timestamps": timestamps,
            "video_links": list(video_links),
            "engine": "Local Context Extractor (Fallback)"
        }
