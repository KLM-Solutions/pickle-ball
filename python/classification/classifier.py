"""Main stroke classifier logic."""
from typing import List, Dict, Any, Counter
from .heuristics import classify_frame

class StrokeClassifier:
    def __init__(self):
        self.history = []
        
    def classify_sequence(self, frames_metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Classify a sequence of frames (a video clip) into a dominant stroke type.
        """
        if not frames_metrics:
            return {"type": "unknown", "confidence": 0.0}
            
        frame_votes = []
        
        for metric in frames_metrics:
            # We assume metric contains keys like "right_knee_flexion", etc.
            # And potentially raw landmark data if passed through
            vote = classify_frame(metric, None) 
            frame_votes.append(vote)
            
        # Majority vote
        vote_counts = Counter(frame_votes)
        if not vote_counts:
            return {"type": "unknown", "confidence": 0.0}
            
        most_common, count = vote_counts.most_common(1)[0]
        confidence = count / len(frames_metrics)
        
        return {
            "type": most_common,
            "confidence": round(confidence, 2),
            "votes": dict(vote_counts)
        }

    def detect_segments(self, frames_metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect temporal segments where specific strokes occur.
        """
        segments = []
        if not frames_metrics:
            return segments

        current_type = None
        start_idx = 0
        
        # Simple run-length encoding style grouping
        for i, metric in enumerate(frames_metrics):
            stroke_type = classify_frame(metric, None)
            
            # If type changes, finalize previous segment
            if stroke_type != current_type:
                if current_type is not None:
                    # End of segment
                    segments.append({
                        "start_frame": start_idx,
                        "end_frame": i - 1,
                        "stroke_type": current_type,
                        "confidence": 0.85 # Placeholder confidence for heuristics
                    })
                
                # Start new segment
                current_type = stroke_type
                start_idx = i
        
        # Finalize last segment
        if current_type is not None:
            segments.append({
                "start_frame": start_idx,
                "end_frame": len(frames_metrics) - 1,
                "stroke_type": current_type,
                "confidence": 0.85
            })

        # Filter out very short segments (e.g. < 5 frames = 0.16s at 30fps)
        # And ignore 'unknown' segments if we decide to label them as such
        # Since classify_frame now returns None for unknown, we filter those out.
        valid_segments = [
            s for s in segments 
            if s["stroke_type"] is not None 
            and (s["end_frame"] - s["start_frame"] + 1) >= 5
        ]
        
        return valid_segments
