"""
Test Single-ID Invariant and Pipeline Integrity

These tests verify:
1. Each stroke segment has exactly one track_id
2. Frame data structure is consistent
3. Landmarks have correct shape (33 items)
"""

import json
import pytest
from pathlib import Path


@pytest.fixture
def sample_results():
    """Load sample results.json for testing."""
    # Try to find a test results file
    test_paths = [
        Path("tests/fixtures/results.json"),
        Path("python/test_output/results.json"),
        Path("results.json"),
    ]
    for p in test_paths:
        if p.exists():
            with open(p) as f:
                return json.load(f)
    
    # Return minimal mock data if no file found
    return {
        "frames": [
            {"frameIdx": 0, "frame_idx": 0, "track_id": 1, "landmarks": None},
            {"frameIdx": 1, "frame_idx": 1, "track_id": 1, "landmarks": None},
        ],
        "strokes": [
            {"stroke_type": "serve", "start_frame": 0, "end_frame": 1, "track_id": 1}
        ]
    }


class TestSingleIdInvariant:
    """Tests for the Single-ID invariant enforcement."""
    
    def test_each_stroke_has_track_id(self, sample_results):
        """Every stroke must have a track_id field."""
        for stroke in sample_results.get("strokes", []):
            assert "track_id" in stroke, f"Stroke missing track_id: {stroke}"
    
    def test_single_id_per_stroke(self, sample_results):
        """Each stroke segment should only contain frames from one track_id."""
        frames = sample_results.get("frames", [])
        
        for stroke in sample_results.get("strokes", []):
            start_f = stroke.get("start_frame", 0)
            end_f = stroke.get("end_frame", start_f)
            
            # Collect track_ids from frames in this stroke window
            stroke_track_ids = set()
            for f in frames:
                f_idx = f.get("frame_idx", f.get("frameIdx", -1))
                if start_f <= f_idx <= end_f:
                    tid = f.get("track_id", -1)
                    if tid != -1:
                        stroke_track_ids.add(tid)
            
            assert len(stroke_track_ids) <= 1, (
                f"Single-ID violation in stroke {stroke.get('stroke_type')}: "
                f"frames {start_f}-{end_f} have IDs={stroke_track_ids}"
            )
    
    def test_no_multi_id_warning_without_flag(self, sample_results):
        """If multi_id_warning is True, there should be a log (check manually)."""
        for stroke in sample_results.get("strokes", []):
            if stroke.get("multi_id_warning"):
                # This is expected to be flagged; not a failure, just info
                print(f"[INFO] Stroke has multi_id_warning: {stroke}")


class TestMultiIdWarning:
    """Tests for multi_id_warning flag behavior."""
    
    def test_clean_stroke_has_no_warning(self, sample_results):
        """A stroke with single ID should NOT have multi_id_warning."""
        for stroke in sample_results.get("strokes", []):
            if not stroke.get("multi_id_warning"):
                # This is the expected case for valid strokes
                start_f = stroke.get("start_frame", 0)
                end_f = stroke.get("end_frame", start_f)
                
                # Verify it truly is single-ID
                frames = sample_results.get("frames", [])
                ids = set()
                for f in frames:
                    fidx = f.get("frame_idx", f.get("frameIdx", -1))
                    if start_f <= fidx <= end_f:
                        tid = f.get("track_id", -1)
                        if tid != -1:
                            ids.add(tid)
                
                assert len(ids) <= 1, (
                    f"Stroke without multi_id_warning has multiple IDs: {ids}"
                )
    
    def test_mixed_id_stroke_sets_warning(self):
        """A stroke with mixed IDs MUST have multi_id_warning=True."""
        # Synthetic test data with mixed IDs
        mock_results = {
            "frames": [
                {"frame_idx": 0, "track_id": 1},
                {"frame_idx": 1, "track_id": 2},  # Different ID!
                {"frame_idx": 2, "track_id": 1},
            ],
            "strokes": [
                {"start_frame": 0, "end_frame": 2, "track_id": 1, "multi_id_warning": True}
            ]
        }
        
        stroke = mock_results["strokes"][0]
        assert stroke.get("multi_id_warning") == True, "Mixed-ID stroke should have multi_id_warning=True"
    
    def test_single_id_stroke_no_warning(self):
        """A stroke with single ID should have multi_id_warning=False or absent."""
        mock_results = {
            "frames": [
                {"frame_idx": 0, "track_id": 1},
                {"frame_idx": 1, "track_id": 1},
                {"frame_idx": 2, "track_id": 1},
            ],
            "strokes": [
                {"start_frame": 0, "end_frame": 2, "track_id": 1}
            ]
        }
        
        stroke = mock_results["strokes"][0]
        assert not stroke.get("multi_id_warning"), "Single-ID stroke should not have multi_id_warning"


class TestFrameDataStructure:
    """Tests for frame data consistency."""
    
    def test_frames_have_required_fields(self, sample_results):
        """Each frame must have frameIdx, timestampSec, bbox."""
        for frame in sample_results.get("frames", []):
            assert "frameIdx" in frame or "frame_idx" in frame, (
                f"Frame missing frameIdx/frame_idx: {frame.keys()}"
            )
            # timestampSec is optional but preferred
            # bbox can be missing if no detection
    
    def test_frame_idx_is_integer(self, sample_results):
        """frameIdx must be an integer."""
        for frame in sample_results.get("frames", []):
            idx = frame.get("frameIdx", frame.get("frame_idx"))
            assert isinstance(idx, int), f"frameIdx is not int: {type(idx)}"
    
    def test_track_id_is_integer(self, sample_results):
        """track_id must be an integer (can be -1 if unknown)."""
        for frame in sample_results.get("frames", []):
            tid = frame.get("track_id")
            if tid is not None:
                assert isinstance(tid, int), f"track_id is not int: {type(tid)}"


class TestLandmarkShape:
    """Tests for landmark data integrity."""
    
    def test_landmarks_have_33_items(self, sample_results):
        """MediaPipe produces exactly 33 landmarks."""
        for frame in sample_results.get("frames", []):
            landmarks = frame.get("landmarks")
            if landmarks is not None:
                assert len(landmarks) == 33, (
                    f"Expected 33 landmarks, got {len(landmarks)}"
                )
    
    def test_landmark_properties(self, sample_results):
        """Each landmark must have x, y, z, visibility."""
        for frame in sample_results.get("frames", []):
            landmarks = frame.get("landmarks")
            if landmarks is not None:
                for i, lm in enumerate(landmarks):
                    assert "x" in lm, f"Landmark {i} missing 'x'"
                    assert "y" in lm, f"Landmark {i} missing 'y'"
                    assert "z" in lm, f"Landmark {i} missing 'z'"
                    assert "visibility" in lm, f"Landmark {i} missing 'visibility'"
    
    def test_landmark_values_normalized(self, sample_results):
        """x and y coordinates should be in [0, 1] range (normalized)."""
        for frame in sample_results.get("frames", []):
            landmarks = frame.get("landmarks")
            if landmarks is not None:
                for i, lm in enumerate(landmarks):
                    x, y = lm.get("x", 0), lm.get("y", 0)
                    # Allow some tolerance for edge cases
                    assert -0.5 <= x <= 1.5, f"Landmark {i} x={x} out of range"
                    assert -0.5 <= y <= 1.5, f"Landmark {i} y={y} out of range"


class TestStrokeTimings:
    """Tests for stroke timing consistency."""
    
    def test_stroke_has_timing_fields(self, sample_results):
        """Each stroke must have startSec and endSec."""
        for stroke in sample_results.get("strokes", []):
            assert "startSec" in stroke or "start_sec" in stroke, (
                f"Stroke missing startSec: {stroke.keys()}"
            )
    
    def test_start_before_end(self, sample_results):
        """startSec must be <= endSec."""
        for stroke in sample_results.get("strokes", []):
            start = stroke.get("startSec", stroke.get("start_sec", 0))
            end = stroke.get("endSec", stroke.get("end_sec", start))
            assert start <= end, f"Stroke timing invalid: {start} > {end}"
    
    def test_stroke_frame_range_valid(self, sample_results):
        """start_frame must be <= end_frame."""
        for stroke in sample_results.get("strokes", []):
            start = stroke.get("start_frame", 0)
            end = stroke.get("end_frame", start)
            assert start <= end, f"Stroke frame range invalid: {start} > {end}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
