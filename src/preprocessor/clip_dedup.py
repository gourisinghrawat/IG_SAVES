import logging
from typing import List, Dict, Any, Tuple
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

from config.settings import CLIP_MODEL_NAME, CLIP_DEDUP_THRESHOLD

logger = logging.getLogger(__name__)

class CLIPDeduplicator:
    def __init__(self, model_name: str = CLIP_MODEL_NAME, threshold: float = CLIP_DEDUP_THRESHOLD):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.threshold = threshold
        logger.info(f"Loading CLIP model ({model_name}) on device={self.device}...")
        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_name)

    def encode_image(self, image_path: str) -> torch.Tensor:
        """
        Encodes a single image using CLIP vision encoder.
        Returns a normalized vector tensor.
        """
        image = Image.open(image_path).convert("RGB")
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            features = self.model.get_image_features(**inputs)
            features = F.normalize(features, p=2, dim=-1)
        return features

    def encode_text(self, text: str) -> List[float]:
        """
        Encodes a text string using CLIP text encoder into the shared multimodal vector space.
        """
        inputs = self.processor(text=[text], return_tensors="pt", padding=True).to(self.device)
        with torch.no_grad():
            features = self.model.get_text_features(**inputs)
            features = F.normalize(features, p=2, dim=-1)
        return features.cpu().numpy()[0].tolist()

    def deduplicate(self, frames: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        """
        Deduplicates visual frames based on CLIP embedding cosine similarity.
        Returns deduplicated frames with embeddings and deduplication metrics.
        """
        if not frames:
            return [], {"total": 0, "unique": 0, "removed": 0}

        unique_frames = []
        last_embedding = None

        for frame in frames:
            feat = self.encode_image(frame["frame_path"])
            
            if last_embedding is None:
                frame["embedding"] = feat.cpu().numpy()[0].tolist()
                unique_frames.append(frame)
                last_embedding = feat
            else:
                sim = torch.mm(feat, last_embedding.T).item()
                if sim < self.threshold:
                    frame["embedding"] = feat.cpu().numpy()[0].tolist()
                    unique_frames.append(frame)
                    last_embedding = feat

        stats = {
            "total": len(frames),
            "unique": len(unique_frames),
            "removed": len(frames) - len(unique_frames)
        }
        logger.info(f"Deduplication finished: {stats['total']} total -> {stats['unique']} unique ({stats['removed']} removed)")
        return unique_frames, stats
