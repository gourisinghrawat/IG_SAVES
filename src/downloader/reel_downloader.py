import json
import logging
from pathlib import Path
from typing import Dict, Any
import yt_dlp

from config.settings import RAW_REELS_DIR

logger = logging.getLogger(__name__)

import re

def extract_creator_from_url(url: str) -> str:
    if not url:
        return "unknown"
    match = re.search(r"instagram\.com/([^/]+)/(?:reel|p)/", url)
    if match:
        creator = match.group(1)
        if creator.lower() not in ["reel", "p", "reels", "stories", "tv"]:
            return creator
    return "unknown"

def get_reel_metadata(video_id: str, webpage_url: str = "") -> dict:
    uploader = extract_creator_from_url(webpage_url)
    caption = ""
    
    for filename in [f"{video_id}_meta.json", f"{video_id}.info.json"]:
        meta_file = RAW_REELS_DIR / filename
        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if uploader == "unknown" or not uploader:
                        uploader = data.get("uploader") or data.get("uploader_id") or data.get("channel") or extract_creator_from_url(data.get("webpage_url", ""))
                    if not caption:
                        caption = data.get("description") or data.get("caption") or data.get("title") or ""
            except Exception:
                pass

    return {
        "uploader": uploader if uploader else "unknown",
        "caption": caption if caption else ""
    }

class ReelDownloader:
    def __init__(self, output_dir: Path = RAW_REELS_DIR):
        self.output_dir = output_dir

    def download(self, url: str) -> Dict[str, Any]:
        """
        Downloads a video/reel from a URL and extracts caption metadata.
        Returns a dict containing file paths and metadata.
        """
        ydl_opts = {
            'outtmpl': str(self.output_dir / '%(id)s.%(ext)s'),
            # Prefer single pre-merged format (video+audio in one file) to avoid needing ffmpeg
            'format': 'best[ext=mp4]/best/b',
            'writeinfojson': True,
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Extracting video info from {url}...")
            try:
                info = ydl.extract_info(url, download=True)
            except Exception as e:
                logger.warning(f"Initial yt-dlp download failed ({e}). Retrying with generic single format...")
                ydl_opts['format'] = 'b/best'
                with yt_dlp.YoutubeDL(ydl_opts) as fallback_ydl:
                    info = fallback_ydl.extract_info(url, download=True)
            video_id = info.get('id', 'reel_video')
            
            video_path = self.output_dir / f"{video_id}.mp4"
            if not video_path.exists():
                # Fallback check if extension differed
                downloaded_files = list(self.output_dir.glob(f"{video_id}.*"))
                video_files = [f for f in downloaded_files if f.suffix != '.json']
                if video_files:
                    video_path = video_files[0]

            webpage_url = info.get("webpage_url") or url
            uploader = info.get("uploader") or info.get("uploader_id") or info.get("channel") or extract_creator_from_url(webpage_url)
            description = info.get("description") or info.get("caption") or info.get("title") or ""

            meta_data = {
                "id": video_id,
                "title": info.get("title", ""),
                "description": description,
                "uploader": uploader,
                "webpage_url": webpage_url,
                "duration": info.get("duration", 0),
            }

            meta_path = self.output_dir / f"{video_id}_meta.json"
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta_data, f, indent=2, ensure_ascii=False)

            return {
                "video_id": video_id,
                "video_path": str(video_path),
                "metadata_path": str(meta_path),
                "metadata": meta_data
            }
