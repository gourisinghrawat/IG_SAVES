import cv2
import logging
from pathlib import Path
from typing import List, Dict, Any

from config.settings import KEYFRAMES_DIR

logger = logging.getLogger(__name__)

class FrameExtractor:
    def __init__(self, output_base_dir: Path = KEYFRAMES_DIR):
        self.output_base_dir = output_base_dir

    def extract_frames(self, video_path: str, video_id: str, sample_interval_sec: float = 1.0) -> List[Dict[str, Any]]:
        """
        Samples video frames at fixed time intervals (e.g. 1 fps) using OpenCV.
        Saves frames to keyframes directory and returns metadata with timestamps.
        """
        save_dir = self.output_base_dir / video_id
        save_dir.mkdir(parents=True, exist_ok=True)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video file: {video_path}")
            return []

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30.0

        frame_interval = int(fps * sample_interval_sec)
        if frame_interval < 1:
            frame_interval = 1

        extracted_frames = []
        frame_count = 0
        saved_index = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                timestamp_sec = round(frame_count / fps, 2)
                frame_filename = save_dir / f"frame_{saved_index:04d}_{int(timestamp_sec)}s.jpg"
                
                # Save frame image
                cv2.imwrite(str(frame_filename), frame)

                extracted_frames.append({
                    "frame_index": saved_index,
                    "timestamp": timestamp_sec,
                    "frame_path": str(frame_filename)
                })
                saved_index += 1

            frame_count += 1

        cap.release()
        logger.info(f"Extracted {len(extracted_frames)} frames from video {video_id}")
        return extracted_frames
