import os
import sys
import math
import tempfile
from pathlib import Path
import subprocess
import glob


def _repo_root() -> Path:
    # tests/ -> repo root
    return Path(__file__).resolve().parents[1]


def _ensure_import_paths() -> None:
    root = _repo_root()
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    py_dir = root / "python"
    if py_dir.exists() and str(py_dir) not in sys.path:
        sys.path.insert(0, str(py_dir))


def _fail(reason: str) -> None:
    print(f"❌ SERVE DETECTION FAILED: {reason}")
    raise SystemExit(1)


def _ok(msg: str) -> None:
    print(f"✅ {msg}")


def main() -> None:
    _ensure_import_paths()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    video_path = r"D:\pickle-ball-main\videos\serve 1.mp4"
    stroke_type = "serve"
    target_track_id = 1
    step = 1

    if step != 1:
        _fail("step must be 1 for this test")
    if target_track_id != 1:
        _fail("target_track_id must be 1 for this test")

    # CPU-only guard: do not allow CUDA visibility in this test harness
    os.environ["CUDA_VISIBLE_DEVICES"] = ""

    # Frame extraction: call ffmpeg (matches existing handler behavior, but avoids importing runpod worker module)
    def extract_frames_ffmpeg(video: str, out_dir: str, fps: int = 30) -> bool:
        Path(out_dir).mkdir(parents=True, exist_ok=True)
        cmd = [
            "ffmpeg",
            "-i",
            video,
            "-vf",
            f"fps={fps}",
            os.path.join(out_dir, "frame_%04d.png"),
            "-y",
            "-loglevel",
            "error",
        ]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if r.returncode != 0:
                print(r.stderr.strip() or "ffmpeg failed")
                return False
            return True
        except Exception as e:
            print(f"ffmpeg exception: {e}")
            return False

    try:
        import cv2  # type: ignore
    except Exception as e:
        _fail(f"cannot import opencv-python (cv2): {e}")

    try:
        import mediapipe as mp  # type: ignore
    except Exception as e:
        _fail(f"cannot import mediapipe: {e}")

    try:
        from biomechanics import BiomechanicsAnalyzer  # type: ignore
    except Exception as e:
        _fail(f"cannot import python/biomechanics.BiomechanicsAnalyzer: {e}")

    try:
        from biomechanics.kinematics import velocity as series_velocity  # type: ignore
    except Exception as e:
        _fail(f"cannot import python/biomechanics.kinematics.velocity: {e}")

    # Serve detection modules (must exist for this test to verify behavior)
    # PRIORITY: Use local python/ from THIS repo (patched heuristics)
    def _ensure_serve_detection_imports():
        local_py = _repo_root() / "python"
        if str(local_py) not in sys.path:
            sys.path.insert(0, str(local_py))
        
        # Force reimport from local path
        for mod_name in list(sys.modules.keys()):
            if mod_name.startswith("classification"):
                del sys.modules[mod_name]
        
        try:
            from classification import StrokeClassifier  # type: ignore
            from classification.heuristics import classify_stroke_enhanced  # type: ignore
            print(f"[INFO] Using serve detection modules from: {local_py}")
            return StrokeClassifier, classify_stroke_enhanced
        except Exception as e:
            _fail(f"serve detection modules not found (classification.heuristics unavailable): {e}")

    StrokeClassifier, classify_stroke_enhanced = _ensure_serve_detection_imports()

    if not os.path.exists(video_path):
        _fail(f"video not found: {video_path}")

    with tempfile.TemporaryDirectory(prefix="serve_test_") as tmp:
        tmp_path = Path(tmp)
        frames_dir = tmp_path / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        ok = extract_frames_ffmpeg(video_path, str(frames_dir), fps=30)
        if not ok:
            _fail("frame extraction failed (ffmpeg)")

        frame_files = sorted(frames_dir.glob("frame_*.png"))
        if not frame_files:
            _fail("no frames extracted")

        # FPS estimation from timestamps (30fps extraction)
        fps = 30.0
        dt = 1.0 / fps

        mp_pose = mp.solutions.pose
        pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        analyzer = BiomechanicsAnalyzer()
        all_frames_metrics = []
        wrist_y_series = []

        # Process every frame (step=1), CPU-only
        for i, fp in enumerate(frame_files):
            img = cv2.imread(str(fp))
            if img is None:
                continue

            h, w = img.shape[:2]
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            res = pose.process(rgb)

            metrics = {}
            if res is not None and res.pose_landmarks:
                analyzer.update_landmarks(res.pose_landmarks, w, h)
                metrics = analyzer.analyze_metrics(stroke_type=stroke_type) or {}

            # Ensure key fields exist for classification history
            metrics["frame_idx"] = int(i)
            metrics["time_sec"] = round(i / fps, 3)
            all_frames_metrics.append(metrics)
            wrist_y_series.append(float(metrics.get("right_wrist_y", 0.0) or 0.0))

        # Add wrist velocity (reuses existing kinematics helper)
        v_series = series_velocity(wrist_y_series, dt=dt)
        for i, m in enumerate(all_frames_metrics):
            m["wrist_velocity_y"] = float(abs(v_series[i])) if i < len(v_series) else 0.0

        # Use the StrokeClassifier to detect segments (includes merging)
        classifier = StrokeClassifier()
        all_segments = classifier.detect_segments(all_frames_metrics, target_type="serve")
        
        # Filter to only serve segments
        serves = [s for s in all_segments if s.get("stroke_type") == "serve"]
        
        # ADDITIONAL MERGE: Merge nearby serve segments with gap <= 5 frames
        merged_serves = []
        for seg in serves:
            if merged_serves:
                gap = seg["start_frame"] - merged_serves[-1]["end_frame"] - 1
                if gap <= 5:  # Merge if gap is small (follow-through/recovery)
                    merged_serves[-1]["end_frame"] = seg["end_frame"]
                    continue
            merged_serves.append(seg.copy())
        serves = merged_serves

        # Compute peak velocity per serve segment (matches track.py behavior using stored wrist_velocity_y)
        for s in serves:
            s_start = int(s.get("start_frame", 0))
            s_end = int(s.get("end_frame", s_start))
            max_v = 0.0
            max_v_frame = s_start
            for m in all_frames_metrics:
                f_idx = int(m.get("frame_idx", -1))
                if s_start <= f_idx <= s_end:
                    v = float(m.get("wrist_velocity_y", 0.0) or 0.0)
                    if v > max_v:
                        max_v = v
                        max_v_frame = f_idx
            s["peak_velocity"] = float(round(max_v, 3))
            s["peak_timestamp"] = float(round(max_v_frame / fps, 3))
            s["startSec"] = float(round(s_start / fps, 3))
            s["endSec"] = float(round(s_end / fps, 3))

        # Human-readable logs
        for idx, s in enumerate(serves):
            print(
                f"[STROKE] serve | start={s['startSec']:.2f}s end={s['endSec']:.2f}s | "
                f"peak={s['peak_timestamp']:.2f}s | velocity={s['peak_velocity']:.3f}"
            )

        print(f"Total serves detected: {len(serves)}")
        print("Serve indices:", [i + 1 for i in range(len(serves))])
        print("Peak velocities:", [s.get("peak_velocity", 0.0) for s in serves])

        # Assertions (smart + video-specific expectations)
        if len(serves) == 0:
            _fail("ZERO serves detected")

        # Find high-confidence serves (velocity >= 1.0 indicates real swing)
        real_serves = [s for s in serves if float(s.get("peak_velocity", 0.0) or 0.0) >= 1.0]
        print(f"High-confidence serves (velocity >= 1.0): {len(real_serves)}")
        
        if len(real_serves) == 0:
            _fail("No high-velocity serves detected (all peak_velocity < 1.0)")

        # This specific test video expectation: there should be a serve with peak in 5.7-6.7s range
        target_serve = None
        for s in real_serves:
            peak_ts = float(s.get("peak_timestamp", 0.0) or 0.0)
            if 5.7 <= peak_ts <= 6.7:
                target_serve = s
                break
        
        if target_serve is None:
            _fail(f"No serve found with peak_timestamp between 5.7s and 6.7s")
        
        print(f"Target serve found: peak={target_serve['peak_timestamp']:.2f}s velocity={target_serve['peak_velocity']:.3f}")

        _ok("SERVE DETECTION VERIFIED (SINGLE / MULTI SERVE READY)")


if __name__ == "__main__":
    main()

