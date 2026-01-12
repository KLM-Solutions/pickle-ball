import os
import sys
import json
import tempfile
from pathlib import Path
import subprocess


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

    video_path = r"D:\pickle-ball-main\videos\Serve 2.mp4"
    stroke_type = "serve"
    step = 1
    crop_region = "0.5022303256851833,0.28503562256643156,0.5959040044628838,0.7996832744224887"

    if step != 1:
        _fail("step must be 1 for this test")

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

    # We validate end-to-end by running python/track.py (with CPU device and crop_region)
    repo_root = _repo_root()
    py_dir = repo_root / "python"
    track_py = py_dir / "track.py"

    if not os.path.exists(video_path):
        _fail(f"video not found: {video_path}")

    with tempfile.TemporaryDirectory(prefix="serve_test_") as tmp:
        tmp_path = Path(tmp)
        frames_dir = tmp_path / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        ok = extract_frames_ffmpeg(video_path, str(frames_dir), fps=30)
        if not ok:
            _fail("frame extraction failed (ffmpeg)")

        out_dir = tmp_path / "out"
        out_dir.mkdir(parents=True, exist_ok=True)
        results_json = tmp_path / "results.json"

        cmd = [
            sys.executable, str(track_py),
            "--input_dir", str(frames_dir),
            "--output_dir", str(out_dir),
            "--results_json", str(results_json),
            "--stroke_type", stroke_type,
            "--step", str(step),
            "--video_path", video_path,
            "--crop_region", crop_region,
            "--device", "cpu",
            "--no_skeleton_video",
            "--no_video_output",
        ]

        print("[INFO] Running track.py on CPU with crop_region...")
        print("Command:", " ".join(cmd))
        run = subprocess.run(cmd, capture_output=True, text=True, cwd=str(py_dir))
        print("--- track.py STDOUT ---")
        print(run.stdout)
        print("--- track.py STDERR ---")
        print(run.stderr)
        if run.returncode != 0:
            _fail("track.py failed on CPU (see logs above)")

        if not results_json.exists():
            _fail("results.json not produced by track.py")

        data = json.loads(results_json.read_text(encoding="utf-8"))
        strokes = data.get("strokes", [])
        if not strokes:
            _fail("ZERO serves detected")

        # Human-readable logs
        for s in strokes:
            st = (s.get("stroke_type") or s.get("type") or "unknown")
            print(
                f"[STROKE] {st} | start={float(s.get('startSec', 0.0)):.2f}s end={float(s.get('endSec', 0.0)):.2f}s | "
                f"peak={float(s.get('peak_timestamp', s.get('startSec', 0.0))):.2f}s | "
                f"velocity={float(s.get('peak_velocity', 0.0)):.3f}"
            )

        # Video-specific expectation: serve peak around 4–6 seconds (your contact ~4.47s, peak ~5.03s)
        ok_peak = any(4.0 <= float(s.get("peak_timestamp", 0.0) or 0.0) <= 6.0 for s in strokes)
        if not ok_peak:
            _fail("No serve found with peak_timestamp between 4.0s and 6.0s")

        _ok("SERVE DETECTION VERIFIED (CPU track.py + crop_region)")


if __name__ == "__main__":
    main()

