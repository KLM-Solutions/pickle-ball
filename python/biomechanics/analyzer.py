"""Orchestrates per-frame biomech metrics."""
import numpy as np
from typing import Any, Dict, Optional, List
from biomechanics.angles import calculate_angle, calculate_hip_rotation, calculate_wrist_position

# MediaPipe Pose Landmark indices (compatible with both legacy and Tasks API)
# These are constants from MediaPipe PoseLandmark enum
class PoseLandmarkIndex:
    NOSE = 0
    LEFT_EYE_INNER = 1
    LEFT_EYE = 2
    LEFT_EYE_OUTER = 3
    RIGHT_EYE_INNER = 4
    RIGHT_EYE = 5
    RIGHT_EYE_OUTER = 6
    LEFT_EAR = 7
    RIGHT_EAR = 8
    MOUTH_LEFT = 9
    MOUTH_RIGHT = 10
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_PINKY = 17
    RIGHT_PINKY = 18
    LEFT_INDEX = 19
    RIGHT_INDEX = 20
    LEFT_THUMB = 21
    RIGHT_THUMB = 22
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32


class BiomechanicsAnalyzer:
    """Analyzes pose landmarks to extract biomechanical metrics."""
    
    def __init__(self):
        # Use local landmark index constants (compatible with MediaPipe 0.10.x Tasks API)
        self.landmark_idx = PoseLandmarkIndex
        self.pose_landmarks = None
        self.crop_w = 0
        self.crop_h = 0
        
    def update_landmarks(self, landmarks, crop_w, crop_h):
        """Update internal state with new landmarks from MediaPipe"""
        self.pose_landmarks = landmarks
        self.crop_w = crop_w
        self.crop_h = crop_h
    
    def get_landmark(self, index):
        """Safe accessor for landmarks - works with both list and object formats"""
        if self.pose_landmarks is None:
            return None
        
        # Handle list format (from track.py serialization)
        if isinstance(self.pose_landmarks, list):
            if index < len(self.pose_landmarks):
                lm = self.pose_landmarks[index]
                # Return object-like wrapper for dict
                if isinstance(lm, dict):
                    return type('Landmark', (), lm)()
                return lm
            return None
        
        # Handle legacy landmark object format
        if hasattr(self.pose_landmarks, 'landmark'):
            if index < len(self.pose_landmarks.landmark):
                return self.pose_landmarks.landmark[index]
        
        # Handle Tasks API format (list of NormalizedLandmark)
        if hasattr(self.pose_landmarks, '__len__') and index < len(self.pose_landmarks):
            return self.pose_landmarks[index]
        
        return None

    def analyze_metrics(self, stroke_type="serve"):
        """
        Analyze current frame based on stroke type.
        Returns a dictionary of calculated metrics.
        """
        if not self.pose_landmarks:
            return {}

        metrics = {}
        
        # Access common landmarks using index constants
        # Right Side
        r_shoulder = self.get_landmark(self.landmark_idx.RIGHT_SHOULDER)
        r_elbow = self.get_landmark(self.landmark_idx.RIGHT_ELBOW)
        r_wrist = self.get_landmark(self.landmark_idx.RIGHT_WRIST)
        r_hip = self.get_landmark(self.landmark_idx.RIGHT_HIP)
        r_knee = self.get_landmark(self.landmark_idx.RIGHT_KNEE)
        r_ankle = self.get_landmark(self.landmark_idx.RIGHT_ANKLE)
        
        # Left Side
        l_shoulder = self.get_landmark(self.landmark_idx.LEFT_SHOULDER)
        l_elbow = self.get_landmark(self.landmark_idx.LEFT_ELBOW)
        l_wrist = self.get_landmark(self.landmark_idx.LEFT_WRIST)
        l_hip = self.get_landmark(self.landmark_idx.LEFT_HIP)
        l_knee = self.get_landmark(self.landmark_idx.LEFT_KNEE)
        l_ankle = self.get_landmark(self.landmark_idx.LEFT_ANKLE)

        # 1. Elbow Flexion (Right arm - assuming right handed for MVP)
        if r_shoulder and r_elbow and r_wrist:
            elbow_angle = calculate_angle(r_shoulder, r_elbow, r_wrist)
            metrics["right_elbow_flexion"] = round(elbow_angle, 1)

        # 2. Shoulder Abduction (trunk-shoulder-elbow)
        # Approximate trunk vertical using hip
        if r_hip and r_shoulder and r_elbow:
            shoulder_angle = calculate_angle(r_hip, r_shoulder, r_elbow)
            metrics["right_shoulder_abduction"] = round(shoulder_angle, 1)

        # 3. Knee Flexion (Right & Left)
        if r_hip and r_knee and r_ankle:
            knee_angle = calculate_angle(r_hip, r_knee, r_ankle)
            metrics["right_knee_flexion"] = round(knee_angle, 1)
        if l_hip and l_knee and l_ankle:
            knee_angle = calculate_angle(l_hip, l_knee, l_ankle)
            metrics["left_knee_flexion"] = round(knee_angle, 1)

        # 4. Hip Rotation
        if r_hip and l_hip:
            rot = calculate_hip_rotation(l_hip, r_hip)
            metrics["hip_rotation_deg"] = round(rot, 1)

        # 5. Wrist position relative to body center (mid-hip)
        if r_wrist and r_hip and l_hip:
            mid_hip_x = (r_hip.x + l_hip.x) / 2.0
            mid_hip_y = (r_hip.y + l_hip.y) / 2.0
            
            dx, dy, dist_norm = calculate_wrist_position(mid_hip_x, mid_hip_y, r_wrist)
            
            # Convert to normalized pixel coords concept if needed, but relative metrics are good
            # Here dist_norm is in 0..1 space or aspect ratio dependent
            # We normalized by crop size in the old code, let's keep it simple here
            metrics["wrist_to_body_distance_norm"] = round(dist_norm, 3)
            metrics["wrist_relative_vector"] = {"x": round(dx, 3), "y": round(dy, 3)}
            
            # Wrist height vs waist (waist approximated as mid-hip)
            # Y increases downwards, so wrist < mid_hip means wrist is ABOVE waist
            metrics["wrist_above_waist"] = bool(r_wrist.y < mid_hip_y)
            
            # Check wrist vs head for overhead
            nose = self.get_landmark(self.landmark_idx.NOSE)
            if nose:
                metrics["wrist_above_head"] = bool(r_wrist.y < nose.y)

        # Stroke Specific Risk Assessment
        metrics["injury_risk"] = "low"
        metrics["feedback"] = []

        # --- RAW COORDINATES FOR CLASSIFIER ---
        if r_shoulder and l_shoulder:
            metrics["right_shoulder_x"] = r_shoulder.x
            metrics["left_shoulder_x"] = l_shoulder.x
        
        if r_wrist: metrics["right_wrist_y"] = r_wrist.y
        if r_hip: metrics["right_hip_y"] = r_hip.y
        nose = self.get_landmark(self.landmark_idx.NOSE)
        if nose: metrics["nose_y"] = nose.y

        # --- PRD: STROKE SPECIFIC FEEDBACK ---
        if stroke_type == "serve":
            # 1. LEGALITY: Paddle (Wrist) vs Waist (Hip)
            # Rule: Contact below navel.
            if r_wrist and r_hip and r_wrist.y < r_hip.y: # Remember Y is down. < means ABOVE.
                 metrics["feedback"].append("FAULT: Contact point too high (Above waist)")
                 metrics["score_impact"] = 30
            
            # 2. POWER: Weight Transfer
            
            # 3. KINETIC CHAIN: Hip Rotation
            if metrics.get("hip_rotation_deg", 0) < 10:
                metrics["feedback"].append("Power: Rotate hips more before contact")

        elif stroke_type == "dink" or stroke_type == "dinking":
            # 1. POSTURE: Knee Bend vs Back Bend
            # Good: knees bent (< 140), back straight.
            knee_flex = metrics.get("right_knee_flexion", 180)
            if knee_flex > 150:
                 metrics["feedback"].append("Form: Get Lower! Bend your knees, not just your back.")
                 metrics["score_impact"] = 15

        elif stroke_type == "overhead":
             # 1. EXTENSION: Elbow at 180
             elbow_flex = metrics.get("right_elbow_flexion", 0)
             if elbow_flex < 150: # Bent arm
                 metrics["feedback"].append("Power: Extend arm fully at contact")
                 metrics["score_impact"] = 10

        return metrics
