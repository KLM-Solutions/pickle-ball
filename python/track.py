import traceback
import argparse
import json
import os
import cv2
import sys
import numpy as np
import shutil
from pathlib import Path
import datetime
# FORCE FLUSH LOGGING
def log_debug(msg):
    ts = datetime.datetime.now().isoformat()
    print(f"[TRACK_PY_DEBUG {ts}] {msg}")
    sys.stdout.flush()
log_debug("Script loading...")
class NumpyEncoder(json.JSONEncoder):
    """ Custom encoder for numpy data types """
    def default(self, obj):
        if isinstance(obj, (np.intc, np.intp, np.int8,
                            np.int16, np.int32, np.int64, np.uint8,
                            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float16, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)
# Optional imports with graceful fallbacks
try:
    from boxmot import create_tracker  # type: ignore
except Exception:
    create_tracker = None  # fallback, no tracker
try:
    from ultralytics import YOLO  # type: ignore
except Exception:
    YOLO = None  # fallback to HOG detector

# GPU Device Detection
import torch
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
log_debug(f"Using device: {DEVICE} (CUDA available: {torch.cuda.is_available()})")

# MediaPipe Tasks API (0.10.x compatible)
mp = None
MP_TASKS_AVAILABLE = False
PoseLandmarker = None
PoseLandmarkerOptions = None
BaseOptions = None
VisionRunningMode = None

try:
    import mediapipe as mp
    # Try new Tasks API first (MediaPipe 0.10.x+)
    try:
        from mediapipe.tasks import python as mp_tasks
        from mediapipe.tasks.python import vision as mp_vision
        PoseLandmarker = mp_vision.PoseLandmarker
        PoseLandmarkerOptions = mp_vision.PoseLandmarkerOptions
        BaseOptions = mp_tasks.BaseOptions
        VisionRunningMode = mp_vision.RunningMode
        MP_TASKS_AVAILABLE = True
        log_debug("MediaPipe Tasks API loaded successfully (0.10.x compatible)")
    except ImportError as e:
        log_debug(f"MediaPipe Tasks API not available: {e}")
        # Fallback: Check for legacy solutions API
        if hasattr(mp, 'solutions'):
            log_debug("Using legacy mp.solutions API")
        else:
            log_debug("WARNING: Neither Tasks API nor solutions API available!")
            mp = None
except ImportError as e:
    log_debug(f"MediaPipe not installed: {e}")
    mp = None
# NEW MODULAR IMPORTS - ENHANCED
try:
    from biomechanics import BiomechanicsAnalyzer, InjuryRiskDetector
    from biomechanics.angles import calculate_biomechanics_for_stroke
    from classification import StrokeClassifier, classify_stroke_enhanced
except Exception as e:
    print(f"ERROR Importing Modules: {e}")
    BiomechanicsAnalyzer = None
    InjuryRiskDetector = None
    StrokeClassifier = None
    calculate_biomechanics_for_stroke = None
    classify_stroke_enhanced = None
def calculate_iou(box1, box2):
    """Calculate Intersection over Union (IoU) between two bounding boxes.
        Args:
        box1: [x1, y1, x2, y2] format
        box2: [x1, y1, x2, y2] format
        Returns:
        float: IoU value between 0 and 1
    """
    # Get intersection coordinates
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
        # No intersection
    if x2 <= x1 or y2 <= y1:
        return 0.0
        # Calculate intersection and union areas
    intersection = (x2 - x1) * (y2 - y1)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = box1_area + box2_area - intersection
    return intersection / union if union > 0 else 0.0
def parse_args():
    parser = argparse.ArgumentParser(description="Run DeepOCSORT with ReID for Pickleball")
    parser.add_argument("--input_dir", type=str, required=True, help="Directory of input frame PNGs")
    parser.add_argument("--output_dir", type=str, required=True, help="Directory to save annotated frames")
    parser.add_argument("--results_json", type=str, required=True, help="Path for output JSON")
    parser.add_argument("--yolo_model", type=str, default="yolov8n.pt", help="YOLOv8 weights")
    parser.add_argument("--reid_model", type=str, default="models/osnet_x1_0_msmt17.pt", help="Path to ReID weights")
    parser.add_argument("--target_point", type=str, default=None, help="Normalized click coordinates 'x,y'")
    parser.add_argument("--crop_region", type=str, default=None, help="Normalized crop region 'cx,cy,w,h'")
    parser.add_argument("--step", type=int, default=1, help="Process every Nth frame (frame skipping)")
    parser.add_argument("--stroke_type", type=str, default="serve", help="Hint for type of stroke being analyzed")
    parser.add_argument("--video_path", type=str, default=None, help="Path to the original video file for FPS detection")
    return parser.parse_args()
def get_video_fps(video_path):
    """Attempt to get FPS from video file."""
    if not video_path or not os.path.exists(video_path):
        return 30.0
    try:
        cap = cv2.VideoCapture(str(video_path))
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS)
            cap.release()
            if fps > 0:
                return fps
    except:
        pass
    return 30.0
def main():
    args = parse_args()
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    results_json = Path(args.results_json)
    step = args.step
    output_dir.mkdir(parents=True, exist_ok=True)
    # 0. Get FPS for timing
    original_video = args.video_path
    fps = get_video_fps(original_video)
    log_debug(f"Initial FPS detected (baseline): {fps}")
    # 1. Initialize detector (YOLO ONLY)
    model = None
    if YOLO is not None:
        try:
            model_path = args.yolo_model
            if not os.path.exists(model_path):
                alt = os.path.join("models", os.path.basename(model_path))
                if os.path.exists(alt):
                    model_path = alt
                # If neither exists, Ultralytics will auto-download, which is fine.
            print(f"Loading YOLO model: {model_path}")
            model = YOLO(model_path)
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to load YOLO model: {e}")
            sys.exit(1) # Stop immediately if we can't load the modern model
    else:
        print("CRITICAL ERROR: Ultralytics YOLO library not installed.")
        sys.exit(1)
    # 2. Initialize Tracker via Factory (optional)
    tracker = None
    if create_tracker is not None:
        try:
            print(f"Loading DeepOCSORT via create_tracker: {args.reid_model}")
            reid_weights = Path(args.reid_model)
            tracker = create_tracker(
                tracker_type='deepocsort', # DeepOCSORT for better reentry
                reid_weights=reid_weights, # Enable Re-ID
                device=DEVICE,  # Use GPU if available
                half=DEVICE == 'cuda',  # Use FP16 on GPU for speed
                per_class=False,
            )
        except Exception as e:
            print(f"Tracker init failed: {e}. Proceeding without tracker.")
    # Initialize MediaPipe Pose - NEW TASKS API (0.10.x compatible)
    pose_landmarker = None
    mp_pose = None  # Keep for legacy drawing utils reference
    POSE_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'pose_landmarker_heavy.task')
    
    if MP_TASKS_AVAILABLE and PoseLandmarker is not None:
        try:
            # Check if model file exists, download if not
            if not os.path.exists(POSE_MODEL_PATH):
                log_debug(f"Pose model not found at {POSE_MODEL_PATH}, downloading...")
                import urllib.request
                os.makedirs(os.path.dirname(POSE_MODEL_PATH), exist_ok=True)
                model_url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
                urllib.request.urlretrieve(model_url, POSE_MODEL_PATH)
                log_debug(f"Pose model downloaded to {POSE_MODEL_PATH}")
            
            # Create PoseLandmarker with VIDEO mode
            options = PoseLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=POSE_MODEL_PATH),
                running_mode=VisionRunningMode.VIDEO,
                num_poses=1,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5,
                output_segmentation_masks=False
            )
            pose_landmarker = PoseLandmarker.create_from_options(options)
            log_debug("MediaPipe PoseLandmarker (Tasks API) initialized successfully")
        except Exception as e:
            log_debug(f"MediaPipe Tasks API init failed: {e}")
            import traceback
            traceback.print_exc()
            pose_landmarker = None
    elif mp is not None and hasattr(mp, 'solutions'):
        # Fallback to legacy solutions API (MediaPipe < 0.10)
        try:
            mp_pose = mp.solutions.pose
            pose_landmarker = mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            log_debug("MediaPipe legacy solutions API initialized")
        except Exception as e:
            log_debug(f"Legacy MediaPipe init failed: {e}")
            pose_landmarker = None
    else:
        log_debug("WARNING: No MediaPipe pose detection available!")
    # Initialize Analysis Modules - ENHANCED
    bio_analyzer = BiomechanicsAnalyzer() if BiomechanicsAnalyzer is not None else None
    classifier = StrokeClassifier() if StrokeClassifier is not None else None
    injury_detector = InjuryRiskDetector() if InjuryRiskDetector is not None else None
        # Update tracker settings for persistence (if tracker exists)
    if tracker is not None:
        # FIXED: More conservative settings for stable tracking
        if hasattr(tracker, 'model') and hasattr(tracker.model, 'max_age'):
            tracker.model.max_age = 300  # Keep ID for 10 seconds (at 30fps) - reduced from 40s
        if hasattr(tracker, 'max_age'):
            tracker.max_age = 300
                    # FIXED: Require more consistent detections before assigning ID
        if hasattr(tracker, 'model') and hasattr(tracker.model, 'min_hits'):
            tracker.model.min_hits = 1  # immediate ID
        if hasattr(tracker, 'min_hits'):
            tracker.min_hits = 1
                # Lower IOU threshold to prevent swaps
        if hasattr(tracker, 'model') and hasattr(tracker.model, 'iou_threshold'):
            tracker.model.iou_threshold = 0.3  
        if hasattr(tracker, 'iou_threshold'):
            tracker.iou_threshold = 0.3
    # Parse target point if provided
    target_point_norm = None
    crop_region_norm = None
    # Parse crop region
    if args.crop_region:
        try:
            # COORDINATE FIX: Parse as x1,y1,x2,y2 (not cx,cy,cw,ch)
            rx1, ry1, rx2, ry2 = map(float, args.crop_region.split(','))
            crop_region_norm = (rx1, ry1, rx2, ry2)
            log_debug(f"Received Crop Region (x1,y1,x2,y2): {crop_region_norm}")
        except:
            print("Invalid crop_region format")
    if args.target_point:
        try:
            px, py = map(float, args.target_point.split(','))
            target_point_norm = (px, py)
            print(f"Received target point (normalized): {target_point_norm}")
        except ValueError:
            print("Invalid target_point format. Expected 'x,y'. Using auto-selection.")
    # 3. Processing Loop
    all_files = sorted([p for p in input_dir.glob("*.png") if p.is_file()], key=lambda p: p.name)
    log_debug(f"Found {len(all_files)} total frames in input_dir.")
    results = [] # Final frames to return to frontend
    all_frames_metrics = [] # To store metrics for sequence classification
    first_lock_frame = -1
    lock_wait_timeout = int(30 * 3) # Wait up to 3 seconds (assuming 30fps) for initial lock
    target_track_id = None
    first_lock_frame = -1
    lock_wait_timeout = int(30 * 3) # Wait up to 3 seconds (assuming 30fps) for initial lock
    target_track_id = None
    lost_frames = 0 # Counter for frames where target is lost
    prev_wrist_px = None
    prev_time_sec = 0.0
    # Stats Tracking
    total_distance_m = 0.0
    prev_center = None
        # --- Skeleton Video Init ---
    skeleton_dir = output_dir
    skeleton_dir.mkdir(parents=True, exist_ok=True)
        # Get frame size from first image
    if not all_files:
        print("Error: No frames found to process.")
        return
    first_frame_path = all_files[0]
    temp_img = cv2.imread(str(first_frame_path))
    skeleton_writer = None
    if temp_img is not None:
        h, w = temp_img.shape[:2]
        # Calculate resulting FPS after step
        # Base FPS is from original video (e.g. 30), result_fps is for output (e.g. 10)
        result_fps = fps / step
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        skeleton_out_path = skeleton_dir / "skeleton_output.mp4"
        skeleton_writer = cv2.VideoWriter(str(skeleton_out_path), fourcc, result_fps, (w, h))
        print(f"Skeleton video will be saved to: {skeleton_out_path} at {result_fps} FPS")
    else:
        print("Error: Could not read first frame.")
    print(f"Processing {len(all_files)} frames (Analysis every {step} steps)...")
    tracker_failed_count = 0
    saved_frame_count = 0
    frames_read_successfully = 0
    frames_with_detections = 0
    
    for i, frame_path in enumerate(all_files):
        # We update the tracker EVERY frame for stability, but only analyze every 'step'
        is_analysis_frame = (i % step == 0)
        img = cv2.imread(str(frame_path))
        
        # DEBUG: Log first few frames to check file reading
        if i < 5:
            if img is None:
                log_debug(f"[FRAME_READ] Frame {i}: FAILED to read from {frame_path}")
            else:
                log_debug(f"[FRAME_READ] Frame {i}: OK - Size {img.shape[1]}x{img.shape[0]}, Path: {frame_path}")
        
        if img is None:
            log_debug(f"[FRAME_READ] Frame {i}: cv2.imread returned None!") if i % 50 == 0 else None
            continue
        
        frames_read_successfully += 1
        height, width = img.shape[:2]
        skeleton_canvas = np.zeros((height, width, 3), dtype=np.uint8)
        best_metrics = {} # Reset per frame
        
        # A. Detection - HYBRID: YOLO only on analysis frames
        detections = np.empty((0, 6))
        if is_analysis_frame:
            # YOLO Inference ONLY on analysis frames to maintain speed
            try:
                # classes=[0] for person only, lower conf to 0.2
                yolo_preds = model.predict(img, classes=[0], conf=0.2, verbose=False, device=DEVICE)[0]
                if yolo_preds.boxes is not None:
                    ds = yolo_preds.boxes.data.cpu().numpy()
                    detections = ds if len(ds) > 0 else np.empty((0, 6))
                    
                    # DEBUG: Log detection counts for first 10 frames
                    if i < 30 or i % 100 == 0:
                        log_debug(f"[YOLO] Frame {i}: {len(detections)} person(s) detected")
                        if len(detections) > 0:
                            frames_with_detections += 1
                            for d_idx, det in enumerate(detections[:3]):  # Log first 3 detections
                                x1, y1, x2, y2, conf, cls = det[:6]
                                log_debug(f"  Detection {d_idx}: bbox=[{int(x1)},{int(y1)},{int(x2)},{int(y2)}], conf={conf:.2f}")
                else:
                    if i < 10:
                        log_debug(f"[YOLO] Frame {i}: No boxes returned from YOLO")
            except Exception as e:
                print(f"YOLO inference failed: {e}")
        # Else: detections remains empty, tracker will use Kalman prediction
        tracks = [] # Initialize to empty list to verify UnboundLocalError
        if tracker is not None:
            try:
                # Update tracker every frame to maintain ID stability
                # BoxMOT strictly expects (N, 6) for [x1, y1, x2, y2, conf, cls]
                if len(detections) == 0:
                    tracks = tracker.update(np.empty((0, 6)), img)
                else:
                    # Log shape for debugging
                    if i % 30 == 0:
                        log_debug(f"Frame {i}: Input detections shape: {detections.shape}")
                    tracks = tracker.update(detections, img)
                if i % 30 == 0:
                    log_debug(f"Frame {i}: Out tracks count: {len(tracks)}")
                    if len(tracks) > 0:
                        log_debug(f"Frame {i}: First track shape: {tracks[0].shape}")
            except Exception as e:
                tracker_failed_count += 1
                log_debug(f"ERROR: Tracker failed on frame {i}: {e}")
                if hasattr(detections, 'shape'):
                    log_debug(f"Detections shape was: {detections.shape}")
                tracks = []
        best_box = None
        best_conf = 0.0
        best_metrics = {}
        best_landmarks = None  # Store raw MediaPipe landmarks for TypeScript analysis
        found = False
        # C. Target Selection Logic - FIXED: Removed nested logic bug
        try:
            if len(tracks) > 0:
                # STICKY LOCK: Prioritize target_track_id if already locked
                if target_track_id is not None:
                    for t in tracks:
                        if int(t[4]) == int(target_track_id):
                            best_box = t[:4]
                            best_conf = t[5]
                            found = True
                            log_debug(f"  --> persistent lock on target ID {target_track_id}")
                            break
                                # If not found via persistent ID, look for a new match if we haven't locked yet
                if not found and target_track_id is None:
                    # FIRST TIME SELECTION (Initial target lock)
                    selected_id = -1
                                        # OPTION 1: ROI / Crop based selection (IoU) - PRIORITY METHOD
                    if crop_region_norm is not None:
                        # Convert normalized crop region to pixels
                        rx1, ry1, rx2, ry2 = crop_region_norm
                        # Ensure rcv values are derived from clean rx and ry
                        rcx = (rx1 + rx2) / 2
                        rcy = (ry1 + ry2) / 2
                                                # COORDINATE ALIGNMENT: Use rx1,ry1,rx2,ry2 standard
                        crop_box_px = [
                            rx1 * width,  # x1
                            ry1 * height, # y1
                            rx2 * width,  # x2
                            ry2 * height  # y2
                        ]
                        log_debug(f"Targeting logic: Frame size={width}x{height}")
                        log_debug(f"Targeting logic: Crop box (px) [{int(crop_box_px[0])}, {int(crop_box_px[1])}, {int(crop_box_px[2])}, {int(crop_box_px[3])}]")
                        best_score = 0
                        best_track_id = None
                        log_debug(f"Targeting logic: Crop center normalized ({rcx:.3f}, {rcy:.3f})")
                        for t in tracks:
                            x1, y1, x2, y2, tid, conf, cls = t[:7]
                            track_box = [x1, y1, x2, y2]
                            tcx, tcy = (x1 + x2) / 2, (y1 + y2) / 2
                            # Calculate IoU between crop region and track bbox
                            iou = calculate_iou(crop_box_px, track_box)
                            
                            # Calculate coverage (how much of person is in crop)
                            ix1, iy1 = max(x1, crop_box_px[0]), max(y1, crop_box_px[1])
                            ix2, iy2 = min(x2, crop_box_px[2]), min(y2, crop_box_px[3])
                            
                            coverage = 0
                            if ix2 > ix1 and iy2 > iy1:
                                inter_area = (ix2 - ix1) * (iy2 - iy1)
                                box_area = (x2 - x1) * (y2 - y1)
                                coverage = inter_area / box_area if box_area > 0 else 0
                                
                            # Distance from crop center (normalized)
                            dist_x = (tcx / width) - rcx
                            dist_y = (tcy / height) - rcy
                            dist_score = 1.0 - np.sqrt(dist_x**2 + dist_y**2)
                            
                            # Check if person center is INSIDE the crop box OR high coverage
                            is_inside = (crop_box_px[0] <= tcx <= crop_box_px[2] and 
                                         crop_box_px[1] <= tcy <= crop_box_px[3]) or coverage > 0.3
                            
                            # Final score: Favor Coverage and Center over raw IoU
                            score = (iou * 0.4) + (coverage * 1.0) + (dist_score * 0.6)
                            
                            if not is_inside:
                                score *= 0.1  # Penalty for being far outside the box
                            
                            log_debug(f"  Candidate Track {int(tid)}: center=({int(tcx)}, {int(tcy)}), IoU={iou:.3f}, Cov={coverage:.3f}, DistScore={dist_score:.3f}, Inside={is_inside}, Total={score:.3f}")

                            if score > best_score:
                                best_score = score
                                best_track_id = int(tid)
                        
                        if best_track_id is not None and best_score > 0.3:  # RELAXED threshold
                            selected_id = best_track_id
                            log_debug(f"--> CROP MATCH FOUND on frame {i}: Selected ID {selected_id} with score {best_score:.3f}")
                        else:
                            # FALLBACK: If no track matches, try raw detections directly
                            if len(detections) > 0:
                                best_det_score = 0
                                for det_idx, det in enumerate(detections):
                                    dx1, dy1, dx2, dy2, dconf, dcls = det[:6]
                                    dtcx, dtcy = (dx1 + dx2) / 2, (dy1 + dy2) / 2
                                    # Use coverage and distance for raw detection matching
                                    dix1, diy1 = max(dx1, crop_box_px[0]), max(dy1, crop_box_px[1])
                                    dix2, diy2 = min(dx2, crop_box_px[2]), min(dy2, crop_box_px[3])
                                    d_coverage = 0
                                    if dix2 > dix1 and diy2 > diy1:
                                        d_inter_area = (dix2 - dix1) * (diy2 - diy1)
                                        d_box_area = (dx2 - dx1) * (dy2 - dy1)
                                        d_coverage = d_inter_area / d_box_area if d_box_area > 0 else 0
                                    
                                    d_score = (d_coverage * 1.5) # Prefer coverage
                                    if d_score > best_det_score:
                                        best_det_score = d_score
                                
                                if best_det_score > 0.5:
                                    log_debug(f"--> RAW DETECTION MATCH on frame {i} (Tracker returned 0 matches)")
                            
                            if i < lock_wait_timeout:
                                # Patiently wait for a good match in the first few seconds
                                if i % 10 == 0:
                                    log_debug(f"Waiting for crop match... (frame {i}/{lock_wait_timeout}, best score so far: {best_score:.3f})")
                                continue # Move to next frame without locking yet
                            else:
                                log_debug(f"Timeout waiting for crop match. Falling back to largest detection.")

                    # OPTION 2: Point-based Selection (Fallback)
                    elif target_point_norm is not None:
                        tx = target_point_norm[0] * width
                        ty = target_point_norm[1] * height
                        
                        min_dist = float('inf')
                        closest_id = None
                        
                        for t in tracks:
                            x1, y1, x2, y2, tid, conf, cls = t[:7]
                            if x1 <= tx <= x2 and y1 <= ty <= y2:
                                # Point is inside bbox - calculate distance to center
                                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                                dist = np.sqrt((cx - tx)**2 + (cy - ty)**2)
                                if dist < min_dist:
                                    min_dist = dist
                                    closest_id = int(tid)
                        
                        if closest_id is not None:
                            selected_id = closest_id
                            print(f"--> POINT MATCH: Selected ID {selected_id} at distance {min_dist:.1f}")

                    # OPTION 3: Largest Area (Auto-selection fallback)
                    # FIX: Strict Spatial + Size Filter
                    # 1. Must be large (> 30000 px)
                    # 2. Must be in NEAR COURT (Bottom 35% of screen, y2 > 0.65 * height)
                    if selected_id == -1:
                        max_area = 0
                        min_y_threshold = height * 0.65 # Bottom 35%
                        
                        for t in tracks:
                            x1, y1, x2, y2, tid, conf, cls = t[:7]
                            area = (x2 - x1) * (y2 - y1)
                            
                            # Filter: Large AND Low (Near Camera)
                            if area > 30000 and y2 > min_y_threshold:
                                if area > max_area:
                                    max_area = area
                                    selected_id = int(tid)
                        
                        if selected_id != -1:
                            print(f"--> AUTO MATCH: Selected Near-Court Target ID {selected_id} (Area: {int(max_area)})")
                    # Lock the target
                    if selected_id != -1:
                        target_track_id = selected_id
                        print(f"=== TARGET LOCKED: ID {target_track_id} ===")
                    else:
                        print("WARNING: No suitable target found")
                
                # Find our target in current tracks
                found = False
                for t in tracks:
                    x1, y1, x2, y2, tid, conf, cls = t[:7]
                    if int(tid) == target_track_id:
                        best_box = [float(x1), float(y1), float(x2), float(y2)]
                        best_conf = float(conf)
                        found = True
                        break
                                # If target is locked but not found in this frame, only continue if it's an analysis frame
                if not found and target_track_id is not None:
                    # STICKY LOCK: If we had a target ID, strictly look for IT first
                    for t in tracks:
                        if int(t[4]) == int(target_track_id):
                            best_box = t[:4]
                            best_conf = t[5]
                            found = True
                            log_debug(f"  --> TARGET ID {target_track_id} RE-LOCKED (Tracker Persistence)")
                            break

                if not found and len(detections) > 0:
                    # FALLBACK: If tracker lost ID, but we have YOLO detections in the ROI, take the best one
                    best_fallback_dist = 1e9
                    best_fallback_det = None
                    
                    for det in detections:
                        dx1, dy1, dx2, dy2, dconf, dcls = det[:6]
                        dtcx, dtcy = (dx1 + dx2) / 2, (dy1 + dy2) / 2
                        
                        # STRICT: Must be inside crop region if one was provided
                        is_in_crop = True
                        if crop_region_norm is not None:
                            rx1, ry1, rx2, ry2 = crop_region_norm
                            crop_x1, crop_y1 = rx1 * width, ry1 * height
                            crop_x2, crop_y2 = rx2 * width, ry2 * height
                            is_in_crop = (crop_x1 <= dtcx <= crop_x2 and crop_y1 <= dtcy <= crop_y2)
                        
                        if not is_in_crop:
                            continue  # Skip detections outside crop
                        
                        # Strict Distance Check (prev_center must exist if we are falling back)
                        if prev_center is not None:
                            dist = np.sqrt((dtcx - prev_center[0])**2 + (dtcy - prev_center[1])**2)
                            if dist < 40:  # STRICT LIMIT (40px)
                                if dist < best_fallback_dist:
                                    best_fallback_dist = dist
                                    best_fallback_det = det

                    if best_fallback_det is not None:
                        # Apply best fallback
                        dx1, dy1, dx2, dy2, dconf, dcls = best_fallback_det[:6]
                        best_box = [dx1, dy1, dx2, dy2]
                        best_conf = dconf
                        found = True
                        log_debug(f"  RE-LOCK FALLBACK (YOLO) on frame {i} (Dist: {best_fallback_dist:.1f}px, IN CROP)")
                
                # Update Persistence Logic
                if found:
                    lost_frames = 0
                    prev_center = ((best_box[0] + best_box[2])/2, (best_box[1] + best_box[3])/2)
                else:
                    lost_frames += 1
                    # TIMEOUT: Keep tracking for 60 frames (~2s at 30fps) - prevents long drift
                    if lost_frames > 60 and target_track_id is not None:
                        log_debug(f"Target ID {target_track_id} lost for {lost_frames} frames (TIMEOUT). Keeping last known position.")
                        # DON'T reset target_track_id - keep trying to find the same person
                        # Only reset prev_center to force strict crop-based re-lock
                        lost_frames = 0

                if not found and target_track_id is not None and prev_center is not None:
                    # FIX: STRICT RE-LOCK - Only re-lock if candidate is INSIDE crop region
                    margin = 50  # pixels
                    px, py = prev_center
                    is_near_edge = (px < margin or px > width - margin or 
                                    py < margin or py > height - margin)
                    
                    # Initialize variables before conditional
                    new_id = None
                    best_candidate = None
                    min_dist = 30  # STRICT: Max 30px distance for re-lock
                    
                    if is_near_edge:
                        if i % 30 == 0:
                            log_debug(f"Target ID {target_track_id} waiting near edge ({int(px)},{int(py)})...")
                    
                    # RELAXED RE-LOCK: Search for candidates near previous position
                    for t in tracks:
                        x1, y1, x2, y2, tid, conf, cls = t[:7]
                        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                        dist = np.sqrt((cx - prev_center[0])**2 + (cy - prev_center[1])**2)
                        
                        bbox_size = (x2 - x1) * (y2 - y1)
                        confidence = float(conf)
                        
                        # STRICT: Must be inside crop region if one was provided
                        is_in_crop = True
                        if crop_region_norm is not None:
                            rx1, ry1, rx2, ry2 = crop_region_norm
                            crop_x1, crop_y1 = rx1 * width, ry1 * height
                            crop_x2, crop_y2 = rx2 * width, ry2 * height
                            is_in_crop = (crop_x1 <= cx <= crop_x2 and crop_y1 <= cy <= crop_y2)
                        
                        # Only consider high-confidence, reasonably-sized detections INSIDE crop
                        if dist < min_dist and confidence > 0.5 and bbox_size > 1000 and is_in_crop:
                            min_dist = dist
                            new_id = int(tid)
                            best_candidate = t
                    
                    if new_id is not None and best_candidate is not None and min_dist < 30:  # STRICT: 30px max
                        log_debug(f"--> STRICT RE-LOCK: Lost ID {int(target_track_id)}, switched to {new_id} (Dist: {min_dist:.1f}px, IN CROP)")
                        target_track_id = new_id
                        # Re-search with new ID
                        for t in tracks:
                            if int(t[4]) == target_track_id:
                                x1, y1, x2, y2, tid, conf, cls = t[:7]
                                best_box = [float(x1), float(y1), float(x2), float(y2)]
                                best_conf = float(conf)
                                found = True
                                break
                    else:
                        if i % 30 == 0:
                            log_debug(f"WARNING: Target ID {target_track_id} lost, no suitable re-lock IN CROP (closest: {min_dist:.1f}px)")
        except Exception as e:
            log_debug(f"CRITICAL ERROR in Target Selection: {e}")
            traceback.print_exc()

        if found:
            x1, y1, x2, y2 = best_box
            # Visual confirmation only for analysis frames
            if is_analysis_frame:
                cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                cv2.putText(img, f"TARGET ID:{target_track_id}", (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Distance Stats
            current_center = ((x1 + x2) / 2, y2)
            bbox_h = y2 - y1
            if prev_center is not None and bbox_h > 0:
                d_px = np.sqrt((current_center[0] - prev_center[0])**2 + (current_center[1] - prev_center[1])**2)
                # Sanity check: if distance is too large, it might be a swap, but we allow it for re-lock
                scale = 1.75 / bbox_h # Assume 1.75m height
                total_distance_m += d_px * scale
            prev_center = current_center

            # --- MediaPipe Pose Estimation (Tasks API 0.10.x compatible) ---
            # ONLY run for analysis frames to maintain performance
            if is_analysis_frame and pose_landmarker is not None:
                try:
                    # FIXED: Better padding calculation
                    pad = max(10, int(bbox_h * 0.15))  # At least 10px padding, 15% of height
                    y1_c, y2_c = max(0, int(y1)-pad), min(height, int(y2)+pad)
                    x1_c, x2_c = max(0, int(x1)-pad), min(width, int(x2)+pad)
                    
                    # FIXED: Ensure minimum crop size for pose detection
                    crop_width = x2_c - x1_c
                    crop_height = y2_c - y1_c
                    
                    pose_result = None
                    normalized_landmarks = None
                    
                    if crop_width > 50 and crop_height > 80:  # Minimum size for pose detection
                        crop = img[y1_c:y2_c, x1_c:x2_c]
                        
                        # FIXED: Validate crop before processing
                        if crop.size > 0 and len(crop.shape) == 3:
                            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                            
                            # Calculate timestamp in milliseconds for Tasks API
                            frame_timestamp_ms = int(i * (1000 / fps))
                            
                            # NEW TASKS API (MediaPipe 0.10.x+)
                            if MP_TASKS_AVAILABLE:
                                # Create MediaPipe Image from numpy array
                                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=crop_rgb)
                                # Run pose detection with timestamp
                                pose_result = pose_landmarker.detect_for_video(mp_image, frame_timestamp_ms)
                                
                                # Extract landmarks if detected
                                if pose_result and pose_result.pose_landmarks and len(pose_result.pose_landmarks) > 0:
                                    normalized_landmarks = pose_result.pose_landmarks[0]  # First detected pose
                                    print(f"DEBUG: Frame {i} - Tasks API detected {len(normalized_landmarks)} landmarks")
                            
                            # LEGACY SOLUTIONS API FALLBACK (MediaPipe < 0.10)
                            elif mp_pose is not None:
                                legacy_result = pose_landmarker.process(crop_rgb)
                                if legacy_result and legacy_result.pose_landmarks:
                                    normalized_landmarks = legacy_result.pose_landmarks.landmark
                                    print(f"DEBUG: Frame {i} - Legacy API detected {len(normalized_landmarks)} landmarks")
                    
                    # Process landmarks if detected
                    if normalized_landmarks is not None:
                        crop_h, crop_w = crop.shape[:2]
                        
                        # Draw skeleton on images
                        # Define colors for visualization
                        JOINT_COLOR = (0, 0, 255)      # RED for joints
                        CONNECTION_COLOR = (0, 255, 255)  # YELLOW for connections
                        JOINT_RADIUS = 4
                        LINE_THICKNESS = 3
                        
                        # Define body connections (excluding head landmarks 0-10)
                        POSE_CONNECTIONS = [
                            (11, 12),  # shoulders
                            (11, 13), (13, 15),  # left arm
                            (12, 14), (14, 16),  # right arm
                            (11, 23), (12, 24),  # torso
                            (23, 24),  # hips
                            (23, 25), (25, 27),  # left leg
                            (24, 26), (26, 28),  # right leg
                            (27, 29), (27, 31),  # left foot
                            (28, 30), (28, 32),  # right foot
                        ]
                        
                        # Extract landmark data for serialization and draw
                        LANDMARK_NAMES = [
                            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
                            'right_eye_inner', 'right_eye', 'right_eye_outer',
                            'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
                            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                            'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
                            'left_index', 'right_index', 'left_thumb', 'right_thumb',
                            'left_hip', 'right_hip', 'left_knee', 'right_knee',
                            'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
                            'left_foot_index', 'right_foot_index'
                        ]
                        
                        best_landmarks = []
                        landmark_points = {}  # For drawing connections
                        
                        for idx, lm in enumerate(normalized_landmarks):
                            name = LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f'landmark_{idx}'
                            
                            # Handle both Tasks API and legacy API landmark formats
                            if hasattr(lm, 'x'):
                                lm_x, lm_y, lm_z = float(lm.x), float(lm.y), float(lm.z)
                                lm_visibility = float(lm.visibility) if hasattr(lm, 'visibility') else 1.0
                            else:
                                # Dict-like format
                                lm_x, lm_y, lm_z = lm['x'], lm['y'], lm['z']
                                lm_visibility = lm.get('visibility', 1.0)
                            
                            best_landmarks.append({
                                'name': name,
                                'x': lm_x,
                                'y': lm_y,
                                'z': lm_z,
                                'visibility': lm_visibility
                            })
                            
                            # Store pixel coordinates for drawing (skip head landmarks 0-10)
                            if idx > 10:
                                px = int(lm_x * crop_w)
                                py = int(lm_y * crop_h)
                                landmark_points[idx] = (px, py)
                                
                                # Draw joint on crop region
                                if 0 <= px < crop_w and 0 <= py < crop_h:
                                    cv2.circle(img[y1_c:y2_c, x1_c:x2_c], (px, py), JOINT_RADIUS, JOINT_COLOR, -1)
                                    cv2.circle(skeleton_canvas[y1_c:y2_c, x1_c:x2_c], (px, py), JOINT_RADIUS, JOINT_COLOR, -1)
                        
                        # Draw connections
                        for start_idx, end_idx in POSE_CONNECTIONS:
                            if start_idx in landmark_points and end_idx in landmark_points:
                                pt1 = landmark_points[start_idx]
                                pt2 = landmark_points[end_idx]
                                cv2.line(img[y1_c:y2_c, x1_c:x2_c], pt1, pt2, CONNECTION_COLOR, LINE_THICKNESS)
                                cv2.line(skeleton_canvas[y1_c:y2_c, x1_c:x2_c], pt1, pt2, CONNECTION_COLOR, LINE_THICKNESS)
                        
                        print(f"DEBUG: Frame {i} - Extracted {len(best_landmarks)} landmarks, drew skeleton")
                            
                except Exception as e:
                    print(f"Pose/Biomech Error: {e}")
                    import traceback
                    traceback.print_exc()

        if not is_analysis_frame:
            continue
            
        # Save Frame Result - FIXED: Use sequential counter for out_filename
        saved_frame_count += 1
        out_filename = f"frame_{saved_frame_count:04d}.png" 
        time_sec = i / fps
        res_entry = {
            "frameIdx": i,  # Original frame index for TypeScript
            "frameFilename": out_filename,
            "timestampSec": round(time_sec, 3),
            "bbox": best_box.tolist() if hasattr(best_box, 'tolist') else (best_box if best_box is not None else [0.0, 0.0, 0.0, 0.0]),
            "confidence": best_conf,
            "track_id": int(target_track_id) if target_track_id else -1,
            "landmarks": best_landmarks  # Raw MediaPipe landmarks for TypeScript analysis
        }
        results.append(res_entry)
        
        # Write Frame
        out_path = output_dir / out_filename
        cv2.imwrite(str(out_path), img)
        if skeleton_writer is not None:
            skeleton_writer.write(skeleton_canvas)

    log_debug(f"Final FPS used: {fps}")
    
    # --- POST-PROCESSING: STROKE CLASSIFICATION ---
    detected_strokes = []
    
    # Define classifier locally if global is missing/None
    classifier = StrokeClassifier() if StrokeClassifier else None
    
    if classifier is not None and len(all_frames_metrics) > 0:
        # Detect segments automatically with BIAS
        raw_segments = classifier.detect_segments(all_frames_metrics, target_type=args.stroke_type)
        
        # STRICT FILTERING: Only keep strokes matching the user's selection
        if args.stroke_type and args.stroke_type.lower() not in ['overall', 'none', '']:
            detected_strokes = []
            dropped_types = []
            for s in raw_segments:
                # Accept if matches target OR if it's our forced fallback
                if (s['stroke_type'].lower() == args.stroke_type.lower() or 
                    s['stroke_type'] == 'forced_fallback'):
                    
                    s['confidence'] = float(s['confidence']) # Ensure float
                    
                    # --- PEAK VELOCITY LOGIC (Ported from Manual Test) ---
                    s_start = s['start_frame']
                    s_end = s['end_frame']
                    max_v = 0.0
                    max_v_frame = s_start
                    
                    # Scan frames in this segment
                    # Note: all_frames_metrics indices might not align perfectly if frames were skipped
                    # But if we strictly appended, they should map via frame_idx
                    for m in all_frames_metrics:
                        f_idx = m.get('frame_idx', -1)
                        if s_start <= f_idx <= s_end:
                            v = m.get('wrist_velocity_y', 0.0)
                            if v > max_v:
                                max_v = v
                                max_v_frame = f_idx
                    
                    s['peak_velocity'] = float(round(max_v, 2))
                    s['peak_frame_idx'] = int(max_v_frame)
                    s['peak_timestamp'] = float(round(max_v_frame / fps, 3))
                    
                    detected_strokes.append(s)
                    
                    # PRINT DETAILED TIMING LOG FOR USER (Verified Format)
                    start_sec = round(s['start_frame'] / fps, 2)
                    end_sec = round(s['end_frame'] / fps, 2)
                    print(f"[RESULT] Found '{s['stroke_type']}': Frame {s['start_frame']}-{s['end_frame']} (t={start_sec}s to {end_sec}s)")
                    print(f"       -> PEAK: Frame {s['peak_frame_idx']} (t={s['peak_timestamp']}s, V={s['peak_velocity']})")
                else:
                    dropped_types.append(s['stroke_type'])
            
            print(f"Strict Filter: Kept {len(detected_strokes)} segments matching '{args.stroke_type}'")
            if dropped_types:
                print(f"  (Dropped {len(dropped_types)} others: {dropped_types})")
        else:
            detected_strokes = raw_segments

        # Final Cleanup for output
        for s in detected_strokes:
             s["startSec"] = round(s["start_frame"] * step / fps, 2)
             s["confidence"] = float(s["confidence"])
             
        print(f"Final Output strokes: {[s['stroke_type'] for s in detected_strokes]}")
    else:
        # Fallback if classifier failed or no metrics
        print("Classifier unavailable or no metrics collected. Using hint.")
        detected_strokes = [{
            "stroke_type": args.stroke_type, # User hint
            "start_frame": 0,
            "startSec": 0.0,
            "confidence": 1.0
        }]

    # Calculate time seconds for frontend
    # Use the original video FPS as reference for timestamps
    for s in detected_strokes:
        # Ensure startSec/endSec exist (camelCase for TS)
        s_start = s.get("start_frame", 0)
        s_end = s.get("end_frame", 0)
        s["startSec"] = round(s_start / fps, 2)
        s["endSec"] = round(s_end / fps, 2)
        # Add snake_case too just in case
        s["start_sec"] = s["startSec"]
        s["end_sec"] = s["endSec"]
        # Ensure type is present
        if "type" not in s and "stroke_type" in s:
            s["type"] = s["stroke_type"]
    # ENHANCED: Get injury risk summary
    injury_risk_summary = {}
    if injury_detector is not None:
        try:
            injury_risk_summary = injury_detector.get_session_summary()
            print(f"Injury Risk Summary: {injury_risk_summary.get('overall_risk', 'unknown')} risk")
            if injury_risk_summary.get('alerts'):
                print(f"  Alerts: {len(injury_risk_summary['alerts'])} detected")
        except Exception as e:
            print(f"Failed to generate injury risk summary: {e}")
        # Save JSON with ENHANCED schema
    final_output = {
        "frames": results, # Per-frame data matched to frontend 'frames' key
        "strokes": detected_strokes, # Segments
        "summary": {
            "total_distance_m": round(total_distance_m, 2),
            "avg_speed_kmh": round((total_distance_m / (len(all_files) / fps) * 3.6), 2) if len(all_files) > 0 else 0,
            "tracked_duration_sec": round(len(all_files) / fps, 1),
            "dominant_stroke": detected_strokes[0]["stroke_type"] if detected_strokes else "unknown"
        },
        "injury_risk_summary": injury_risk_summary  # NEW: Injury risk analysis
    }
    
    # ========================================================================
    # DEBUG SUMMARY - Frame Reading & Detection Stats
    # ========================================================================
    print("\n")
    print("=" * 70)
    print("                    TRACK.PY - DEBUG SUMMARY")
    print("=" * 70)
    print(f"Total files found: {len(all_files)}")
    print(f"Frames read successfully: {frames_read_successfully}")
    print(f"Frames with YOLO detections: {frames_with_detections}")
    print(f"Target track ID: {target_track_id}")
    print(f"Tracker failed count: {tracker_failed_count}")
    if frames_read_successfully == 0:
        print("!!! CRITICAL: No frames were read from disk !!!")
    elif frames_with_detections == 0:
        print("!!! WARNING: YOLO detected 0 people in all frames !!!")
    print("=" * 70)
    
    # ========================================================================
    # CONSOLE LOGGING - FINAL PAYLOAD
    # ========================================================================
    print("\n")
    print("=" * 70)
    print("                    TRACK.PY - FINAL OUTPUT PAYLOAD")
    print("=" * 70)
    print(f"Results JSON Path: {results_json}")
    print(f"Total Frames Processed: {len(results)}")
    print(f"Total Strokes Detected: {len(detected_strokes)}")
    print("-" * 70)
    print("SUMMARY:")
    print(json.dumps(final_output.get("summary", {}), indent=2, cls=NumpyEncoder))
    print("-" * 70)
    print("INJURY RISK SUMMARY:")
    print(json.dumps(injury_risk_summary, indent=2, cls=NumpyEncoder))
    print("-" * 70)
    print("STROKES:")
    print(json.dumps(detected_strokes, indent=2, cls=NumpyEncoder))
    print("-" * 70)
    
    # Log first 3 frames as sample
    print("FRAMES SAMPLE (first 3):")
    sample_frames = results[:3] if len(results) >= 3 else results
    for idx, frame in enumerate(sample_frames):
        frame_info = {
            "frameIdx": frame.get("frameIdx"),
            "timestampSec": frame.get("timestampSec"),
            "bbox": frame.get("bbox"),
            "confidence": frame.get("confidence"),
            "track_id": frame.get("track_id"),
            "landmarks_count": len(frame.get("landmarks", []) or [])
        }
        print(f"  Frame {idx}: {json.dumps(frame_info, cls=NumpyEncoder)}")
    
    print("-" * 70)
    print(f"ANNOTATED VIDEO / SKELETON VIDEO PATH:")
    print(f"  Skeleton Output: {skeleton_dir / 'skeleton_output.mp4'}")
    print("=" * 70)
    print("\n")
    # ========================================================================
    
    with open(results_json, "w") as f:
        json.dump(final_output, f, indent=2, cls=NumpyEncoder)
    
    print("Tracking complete.")
    
    if skeleton_writer is not None:
        skeleton_writer.release()
        print(f"\n[VIDEO] Skeleton video finalized at: {skeleton_out_path}")
        
        # CUSTOM: Copy to D:\pickle-ball-main\Skeleton view as requested
        try:
            target_skel_dir = Path("D:/pickle-ball-main/Skeleton view")
            target_skel_dir.mkdir(parents=True, exist_ok=True)
            target_skel_file = target_skel_dir / "skeleton_output.mp4"
            print(f"[VIDEO] Copying skeleton video to: {target_skel_file}")
            shutil.copy2(skeleton_out_path, target_skel_file)
            print("[VIDEO] Copy successful.")
        except Exception as e:
            print(f"[VIDEO] Failed to copy skeleton video to external dir: {e}")

if __name__ == "__main__":
    main() 


