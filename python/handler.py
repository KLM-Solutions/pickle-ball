"""
RunPod Serverless Handler for Pickleball Video Analysis

This handler receives video analysis jobs and runs the track.py processing pipeline.

Expected input:
{
    "video_url": "https://example.com/video.mp4",  # URL to download video from
    "stroke_type": "serve",                         # serve, groundstroke, dink, overhead, footwork, overall
    "crop_region": "0.2,0.3,0.8,0.9",              # Optional: x1,y1,x2,y2 normalized coords
    "target_point": "0.5,0.6",                      # Optional: x,y normalized coords
    "step": 3                                       # Optional: process every Nth frame (default: 3)
}

Returns:
{
    "frames": [...],           # Per-frame analysis data
    "strokes": [...],          # Detected stroke segments
    "summary": {...},          # Session summary stats
    "injury_risk_summary": {}, # Injury risk analysis
    "annotated_video_base64": "...",  # Optional: base64 encoded video (if small)
    "status": "success"
}
"""

import runpod
import os
import sys
import json
import tempfile
import shutil
import subprocess
import base64
import requests
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the NumpyEncoder from track.py for JSON serialization
from track import NumpyEncoder


def download_video(url: str, dest_path: str) -> bool:
    """Download video from URL to local path."""
    try:
        print(f"Downloading video from: {url}")
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()
        
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"Video downloaded to: {dest_path}")
        return True
    except Exception as e:
        print(f"Failed to download video: {e}")
        return False


def extract_frames(video_path: str, frames_dir: str, fps: int = 30) -> bool:
    """Extract frames from video using ffmpeg."""
    try:
        os.makedirs(frames_dir, exist_ok=True)
        
        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', f'fps={fps}',
            os.path.join(frames_dir, 'frame_%04d.png'),
            '-y'  # Overwrite
        ]
        
        print(f"Extracting frames with: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}")
            return False
        
        frame_count = len(list(Path(frames_dir).glob('*.png')))
        print(f"Extracted {frame_count} frames")
        return frame_count > 0
    except Exception as e:
        print(f"Frame extraction failed: {e}")
        return False


def run_tracking(
    input_dir: str,
    output_dir: str,
    results_json: str,
    stroke_type: str = "serve",
    crop_region: str = None,
    target_point: str = None,
    step: int = 3,
    video_path: str = None
) -> dict:
    """Run the tracking pipeline by calling track.py as a subprocess."""
    try:
        # Build command
        cmd = [
            sys.executable, 'track.py',
            '--input_dir', input_dir,
            '--output_dir', output_dir,
            '--results_json', results_json,
            '--stroke_type', stroke_type,
            '--step', str(step)
        ]
        
        if crop_region:
            cmd.extend(['--crop_region', crop_region])
        if target_point:
            cmd.extend(['--target_point', target_point])
        if video_path:
            cmd.extend(['--video_path', video_path])
        
        print(f"Running tracking: {' '.join(cmd)}")
        
        # Run track.py
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        print(f"track.py stdout: {result.stdout[-2000:]}")  # Last 2000 chars
        if result.stderr:
            print(f"track.py stderr: {result.stderr[-1000:]}")
        
        if result.returncode != 0:
            return {"error": f"Tracking failed with code {result.returncode}", "stderr": result.stderr[-500:]}
        
        # Read results
        if os.path.exists(results_json):
            with open(results_json, 'r') as f:
                return json.load(f)
        else:
            return {"error": "Results JSON not created"}
    
    except Exception as e:
        return {"error": f"Tracking exception: {str(e)}"}


def encode_video_base64(video_path: str, max_size_mb: int = 10) -> str:
    """Encode video to base64 if it's small enough."""
    try:
        if not os.path.exists(video_path):
            return None
        
        size_mb = os.path.getsize(video_path) / (1024 * 1024)
        if size_mb > max_size_mb:
            print(f"Video too large for base64 ({size_mb:.1f}MB > {max_size_mb}MB)")
            return None
        
        with open(video_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception as e:
        print(f"Failed to encode video: {e}")
        return None


def handler(job):
    """
    RunPod serverless handler function.
    
    Receives job input, processes video, returns analysis results.
    """
    job_input = job.get("input", {})
    
    # Validate required input
    video_url = job_input.get("video_url")
    if not video_url:
        return {"error": "Missing required field: video_url"}
    
    # Get optional parameters
    stroke_type = job_input.get("stroke_type", "serve")
    crop_region = job_input.get("crop_region")
    target_point = job_input.get("target_point")
    step = int(job_input.get("step", 3))
    include_video = job_input.get("include_video", False)  # Whether to return base64 video
    
    # Create temp working directory
    work_dir = tempfile.mkdtemp(prefix="runpod_analysis_")
    
    try:
        print(f"Starting analysis job in: {work_dir}")
        print(f"Parameters: stroke_type={stroke_type}, step={step}")
        
        # 1. Download video
        video_path = os.path.join(work_dir, "input.mp4")
        if not download_video(video_url, video_path):
            return {"error": "Failed to download video from URL"}
        
        # 2. Extract frames
        frames_dir = os.path.join(work_dir, "frames")
        if not extract_frames(video_path, frames_dir):
            return {"error": "Failed to extract frames from video"}
        
        # 3. Run tracking analysis
        output_dir = os.path.join(work_dir, "output")
        results_json = os.path.join(work_dir, "results.json")
        
        results = run_tracking(
            input_dir=frames_dir,
            output_dir=output_dir,
            results_json=results_json,
            stroke_type=stroke_type,
            crop_region=crop_region,
            target_point=target_point,
            step=step,
            video_path=video_path
        )
        
        if "error" in results:
            return results
        
        # 4. Optionally encode annotated video
        annotated_video_b64 = None
        if include_video:
            skeleton_video = os.path.join(output_dir, "skeleton_output.mp4")
            annotated_video_b64 = encode_video_base64(skeleton_video)
        
        # 5. Build response
        response = {
            "status": "success",
            "frames": results.get("frames", []),
            "strokes": results.get("strokes", []),
            "summary": results.get("summary", {}),
            "injury_risk_summary": results.get("injury_risk_summary", {}),
        }
        
        if annotated_video_b64:
            response["annotated_video_base64"] = annotated_video_b64
        
        # Add frame count for reference
        response["total_frames_processed"] = len(response["frames"])
        
        print(f"Analysis complete. Processed {response['total_frames_processed']} frames.")
        return response
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Handler exception: {str(e)}"}
    
    finally:
        # Cleanup temp directory
        try:
            shutil.rmtree(work_dir)
            print(f"Cleaned up: {work_dir}")
        except Exception as e:
            print(f"Cleanup failed: {e}")


# Start the RunPod serverless worker
if __name__ == "__main__":
    print("Starting RunPod Serverless Worker...")
    runpod.serverless.start({"handler": handler})

