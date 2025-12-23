"""
RunPod Serverless Handler for Pickleball Video Analysis

This handler receives video analysis jobs, processes them, and uploads results to Supabase.

Expected input:
{
    "video_url": "https://supabase.../storage/v1/object/public/videos/video.mp4",
    "stroke_type": "serve",                         # serve, groundstroke, dink, overhead, footwork, overall
    "crop_region": "0.2,0.3,0.8,0.9",              # Optional: x1,y1,x2,y2 normalized coords
    "target_point": "0.5,0.6",                      # Optional: x,y normalized coords
    "step": 3,                                      # Optional: process every Nth frame (default: 3)
    "job_id": "uuid-optional"                       # Optional: for tracking in database
}

Returns:
{
    "status": "success",
    "video_url": "https://supabase.../analysis-results/job123/annotated.mp4",
    "frames": [
        {"filename": "frame_0001.png", "url": "https://...", "timestampSec": 0.1, "metrics": {...}}
    ],
    "strokes": [...],
    "summary": {...},
    "injury_risk_summary": {...}
}
"""

import runpod
import os
import sys
import json
import tempfile
import shutil
import subprocess
import time
import uuid
from pathlib import Path

import requests

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from track import NumpyEncoder
from supabase_client import get_uploader


def download_video(url: str, dest_path: str) -> bool:
    """Download video from URL to local path."""
    try:
        print(f"Downloading video from: {url}")
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()
        
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        file_size = os.path.getsize(dest_path) / (1024 * 1024)
        print(f"Video downloaded: {dest_path} ({file_size:.1f} MB)")
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
            '-y', '-loglevel', 'error'
        ]
        
        print(f"Extracting frames at {fps} FPS...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}")
            return False
        
        frame_count = len(list(Path(frames_dir).glob('*.png')))
        print(f"Extracted {frame_count} frames")
        return frame_count > 0
    except Exception as e:
        print(f"Frame extraction failed: {e}")
        return False


def encode_video_from_frames(frames_dir: str, output_path: str, fps: int = 10) -> bool:
    """Encode annotated frames back to video."""
    try:
        cmd = [
            'ffmpeg',
            '-framerate', str(fps),
            '-i', os.path.join(frames_dir, 'frame_%04d.png'),
            '-start_number', '1',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-crf', '23',
            '-preset', 'fast',
            output_path,
            '-y', '-loglevel', 'error'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            print(f"FFmpeg encode error: {result.stderr}")
            return False
        
        if os.path.exists(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"Video encoded: {output_path} ({size_mb:.1f} MB)")
            return True
        return False
    except Exception as e:
        print(f"Video encoding failed: {e}")
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
    """Run the tracking pipeline."""
    try:
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
        
        print(f"Running track.py with stroke_type={stroke_type}, step={step}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            timeout=1800  # 30 min max
        )
        
        if result.returncode != 0:
            return {
                "error": f"Tracking failed with code {result.returncode}",
                "stderr": result.stderr[-1000:] if result.stderr else ""
            }
        
        if os.path.exists(results_json):
            with open(results_json, 'r') as f:
                return json.load(f)
        else:
            return {"error": "Results JSON not created"}
    
    except subprocess.TimeoutExpired:
        return {"error": "Processing timeout (exceeded 30 minutes)"}
    except Exception as e:
        return {"error": f"Tracking exception: {str(e)}"}


def handler(job):
    """
    RunPod serverless handler function.
    
    Processes video and uploads results to Supabase.
    """
    start_time = time.time()
    job_input = job.get("input", {})
    
    # Validate required input
    video_url = job_input.get("video_url")
    if not video_url:
        return {"error": "Missing required field: video_url"}
    
    # Get parameters
    stroke_type = job_input.get("stroke_type", "serve")
    crop_region = job_input.get("crop_region")
    target_point = job_input.get("target_point")
    step = int(job_input.get("step", 3))
    job_id = job_input.get("job_id") or str(uuid.uuid4())
    
    # Get Supabase uploader
    uploader = get_uploader()
    
    # Update job status to processing
    uploader.update_job_status(job_id, "processing")
    
    # Create temp working directory
    work_dir = tempfile.mkdtemp(prefix="runpod_analysis_")
    
    try:
        print(f"=== Starting Analysis Job: {job_id} ===")
        print(f"Video URL: {video_url}")
        print(f"Parameters: stroke_type={stroke_type}, step={step}")
        
        # 1. Download video
        video_path = os.path.join(work_dir, "input.mp4")
        if not download_video(video_url, video_path):
            error_msg = "Failed to download video from URL"
            uploader.update_job_status(job_id, "failed", error_message=error_msg)
            return {"error": error_msg}
        
        # 2. Extract frames
        frames_dir = os.path.join(work_dir, "frames")
        if not extract_frames(video_path, frames_dir):
            error_msg = "Failed to extract frames from video"
            uploader.update_job_status(job_id, "failed", error_message=error_msg)
            return {"error": error_msg}
        
        # 3. Run tracking analysis
        output_dir = os.path.join(work_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        results_json_path = os.path.join(work_dir, "results.json")
        
        results = run_tracking(
            input_dir=frames_dir,
            output_dir=output_dir,
            results_json=results_json_path,
            stroke_type=stroke_type,
            crop_region=crop_region,
            target_point=target_point,
            step=step,
            video_path=video_path
        )
        
        if "error" in results:
            uploader.update_job_status(job_id, "failed", error_message=results["error"])
            return results
        
        # 4. Encode annotated video
        annotated_video_path = os.path.join(output_dir, "annotated.mp4")
        output_fps = max(1, 30 // step)
        video_encoded = encode_video_from_frames(output_dir, annotated_video_path, fps=output_fps)
        
        # 5. Upload to Supabase
        result_video_url = None
        frames_data = []
        
        # Upload annotated video
        if video_encoded and os.path.exists(annotated_video_path):
            result_video_url = uploader.upload_file(
                bucket="analysis-results",
                file_path=annotated_video_path,
                destination_path=f"{job_id}/annotated.mp4",
                content_type="video/mp4"
            )
        
        # Upload frames
        frame_files = sorted(Path(output_dir).glob("frame_*.png"))
        print(f"Uploading {len(frame_files)} frames to Supabase...")
        
        uploaded_frames = uploader.upload_directory(
            bucket="analysis-results",
            local_dir=output_dir,
            destination_prefix=f"{job_id}/frames/",
            file_pattern="frame_*.png"
        )
        
        # Build frames response with URLs
        raw_frames = results.get("frames", [])
        for i, frame_data in enumerate(raw_frames):
            # Find matching uploaded frame
            filename = frame_data.get("frameFilename", f"frame_{i+1:04d}.png")
            matching_upload = next(
                (u for u in uploaded_frames if u["filename"] == filename),
                None
            )
            
            frames_data.append({
                "frameIndex": i,
                "timestampSec": frame_data.get("timestampSec", i * step / 30.0),
                "url": matching_upload["url"] if matching_upload else None,
                "bbox": frame_data.get("bbox", [0, 0, 0, 0]),
                "confidence": frame_data.get("confidence", 0),
                "metrics": frame_data.get("metrics", {})
            })
        
        # 6. Calculate processing time
        processing_time = time.time() - start_time
        
        # 7. Build response
        response = {
            "status": "success",
            "job_id": job_id,
            "video_url": result_video_url,
            "frames": frames_data,
            "strokes": results.get("strokes", []),
            "summary": results.get("summary", {}),
            "injury_risk_summary": results.get("injury_risk_summary", {}),
            "total_frames_processed": len(frames_data),
            "processing_time_sec": round(processing_time, 2)
        }
        
        # 8. Update job in database
        uploader.update_job_status(
            job_id=job_id,
            status="completed",
            result_video_url=result_video_url,
            result_json=response,
            frames_folder=f"{job_id}/frames/",
            processing_time_sec=processing_time,
            total_frames=len(frames_data)
        )
        
        print(f"=== Analysis Complete: {job_id} ===")
        print(f"Total time: {processing_time:.1f}s, Frames: {len(frames_data)}")
        
        return response
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = f"Handler exception: {str(e)}"
        uploader.update_job_status(job_id, "failed", error_message=error_msg)
        return {"error": error_msg}
    
    finally:
        # Cleanup temp directory
        try:
            shutil.rmtree(work_dir)
            print(f"Cleaned up: {work_dir}")
        except Exception as e:
            print(f"Cleanup failed: {e}")


# Start the RunPod serverless worker
if __name__ == "__main__":
    print("=" * 60)
    print("StrikeSense Video Analysis Worker")
    print("=" * 60)
    print(f"Supabase URL: {os.environ.get('SUPABASE_URL', 'NOT SET')}")
    print(f"Supabase Key: {'SET' if os.environ.get('SUPABASE_SERVICE_KEY') else 'NOT SET'}")
    print("=" * 60)
    runpod.serverless.start({"handler": handler})
