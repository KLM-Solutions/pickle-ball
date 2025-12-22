"""
Enhanced stroke classification with research-based heuristics.
Based on comprehensive pickleball biomechanics research.
"""
from typing import Tuple, Dict, Any, Optional, List

# Research-based thresholds from biomechanics knowledge base
THRESHOLDS = {
    'overhead': {
        'min_shoulder_abduction': 120,
        'min_wrist_height_ratio': 0.9,  # Relative to head
        'confidence_high': 140  # Shoulder abduction for high confidence
    },
    'serve': {
        'max_wrist_height_ratio': 1.05,  # Relative to waist (slightly above for tolerance)
        'min_elbow_angle': 90,
        'max_elbow_angle': 130,
        'min_hip_rotation': 5  # Minimum rotation for serve
    },
    'dink': {
        'max_shoulder_abduction': 40,
        'max_backswing_frames': 3,  # Minimal backswing
        'min_knee_flexion': 30,  # Stay low
        'max_knee_flexion': 45
    },
    'volley': {
        'min_shoulder_abduction': 40,
        'max_shoulder_abduction': 90,
        'punch_min_shoulder': 60,  # Punch volley uses more shoulder
        'block_max_shoulder': 60   # Block volley minimal shoulder
    },
    'groundstroke': {
        'min_shoulder_abduction': 60,
        'min_hip_rotation': 30,  # Good power generation
        'drive_min_shoulder': 70   # Offensive drive
    }
}


def is_overhead(metrics: Dict[str, Any]) -> Tuple[bool, float]:
    """
    Detect overhead smash based on research criteria.
    
    Criteria:
    - Wrist above head
    - Shoulder abduction > 120°
    
    Returns: (is_overhead, confidence)
    """
    wrist_y = metrics.get('right_wrist_y', 1.0)
    head_y = metrics.get('nose_y', 0.0)
    shoulder_abd = metrics.get('right_shoulder_abduction', 0)
    
    # Primary check: wrist above head
    wrist_above_head = wrist_y < (head_y - 0.05)  # Small buffer
    
    # Secondary check: high shoulder abduction
    high_shoulder = shoulder_abd >= THRESHOLDS['overhead']['min_shoulder_abduction']
    
    if wrist_above_head and high_shoulder:
        # Higher confidence if shoulder > 140°
        if shoulder_abd >= THRESHOLDS['overhead']['confidence_high']:
            return (True, 0.95)
        else:
            return (True, 0.85)
    
    return (False, 0.0)


def is_serve(metrics: Dict[str, Any], frame_history: List[Dict]) -> Tuple[bool, float]:
    """
    Detect serve based on research criteria.
    
    Criteria:
    - Paddle (wrist) below waist
    - Upward arc motion
    - Elbow angle 90-130°
    - Hip rotation present
    
    Returns: (is_serve, confidence)
    """
    wrist_y = metrics.get('right_wrist_y', 0.5)
    hip_y = metrics.get('right_hip_y', 0.5)
    elbow_angle = metrics.get('right_elbow_flexion', 0)
    hip_rotation = metrics.get('hip_rotation_deg', 0)
    
    # Primary check: wrist below waist (y increases downward)
    wrist_below_waist = wrist_y > (hip_y - 0.05)  # Small tolerance
    
    # Check upward motion from frame history
    upward_motion = False
    if len(frame_history) >= 2:
        prev_wrist_y = frame_history[-1].get('right_wrist_y', wrist_y)
        upward_motion = wrist_y < prev_wrist_y  # Moving up
    
    # Check elbow angle in optimal range
    elbow_optimal = (THRESHOLDS['serve']['min_elbow_angle'] <= 
                     elbow_angle <= 
                     THRESHOLDS['serve']['max_elbow_angle'])
    
    # Check hip rotation
    has_hip_rotation = hip_rotation >= THRESHOLDS['serve']['min_hip_rotation']
    
    # Calculate confidence
    if wrist_below_waist:
        confidence = 0.70  # Base
        if upward_motion:
            confidence += 0.10
        if elbow_optimal:
            confidence += 0.05
        if has_hip_rotation:
            confidence += 0.05
        
        return (True, min(confidence, 0.95))
    
    return (False, 0.0)


def is_dink(metrics: Dict[str, Any], frame_history: List[Dict]) -> Tuple[bool, float, str]:
    """
    Detect dink shot based on research criteria.
    
    Criteria:
    - Low shoulder abduction (< 40°)
    - Minimal backswing
    - Low body position (knee flexion 30-45°)
    - Wrist below waist
    
    Returns: (is_dink, confidence, sub_type)
    """
    shoulder_abd = metrics.get('right_shoulder_abduction', 0)
    knee_flexion = metrics.get('right_knee_flexion', 180)
    wrist_y = metrics.get('right_wrist_y', 0.5)
    hip_y = metrics.get('right_hip_y', 0.5)
    
    # Primary check: low shoulder abduction
    low_shoulder = shoulder_abd <= THRESHOLDS['dink']['max_shoulder_abduction']
    
    # Check low body position
    low_body = (THRESHOLDS['dink']['min_knee_flexion'] <= 
                knee_flexion <= 
                THRESHOLDS['dink']['max_knee_flexion'])
    
    # Check minimal backswing from history
    minimal_backswing = True
    if len(frame_history) >= THRESHOLDS['dink']['max_backswing_frames']:
        # Check if shoulder abduction stayed low
        for prev_frame in frame_history[-3:]:
            if prev_frame.get('right_shoulder_abduction', 0) > 50:
                minimal_backswing = False
                break
    
    # Contact point check
    low_contact = wrist_y > hip_y
    
    if low_shoulder and low_body:
        confidence = 0.80  # Base
        if minimal_backswing:
            confidence += 0.07
        if low_contact:
            confidence += 0.05
        
        return (True, min(confidence, 0.95), 'soft_game')
    
    return (False, 0.0, '')


def is_volley(metrics: Dict[str, Any], position_data: Optional[Dict] = None) -> Tuple[bool, float, str]:
    """
    Detect volley based on research criteria.
    
    Criteria:
    - Moderate shoulder abduction (40-90°)
    - At kitchen line (if position data available)
    - Compact motion
    
    Sub-types:
    - Punch volley: Higher shoulder (> 60°), more aggressive
    - Block volley: Lower shoulder (< 60°), defensive
    
    Returns: (is_volley, confidence, sub_type)
    """
    shoulder_abd = metrics.get('right_shoulder_abduction', 0)
    
    # Check shoulder range for volley
    in_volley_range = (THRESHOLDS['volley']['min_shoulder_abduction'] <= 
                       shoulder_abd <= 
                       THRESHOLDS['volley']['max_shoulder_abduction'])
    
    if not in_volley_range:
        return (False, 0.0, '')
    
    # Determine sub-type
    if shoulder_abd >= THRESHOLDS['volley']['punch_min_shoulder']:
        sub_type = 'punch'
        confidence = 0.88
    else:
        sub_type = 'block'
        confidence = 0.85
    
    # Boost confidence if at kitchen line
    if position_data and position_data.get('at_kitchen_line'):
        confidence += 0.05
    
    return (True, min(confidence, 0.95), sub_type)


def is_groundstroke(metrics: Dict[str, Any]) -> Tuple[bool, float, str]:
    """
    Detect groundstroke based on research criteria.
    
    Criteria:
    - Moderate to high shoulder abduction (> 60°)
    - Hip rotation present
    
    Sub-types:
    - Forehand: Right side dominant
    - Backhand: Left side dominant
    - Drive: High shoulder (> 70°), offensive
    
    Returns: (is_groundstroke, confidence, sub_type)
    """
    shoulder_abd = metrics.get('right_shoulder_abduction', 0)
    hip_rotation = metrics.get('hip_rotation_deg', 0)
    
    # Check shoulder range
    is_groundstroke_range = shoulder_abd >= THRESHOLDS['groundstroke']['min_shoulder_abduction']
    
    if not is_groundstroke_range:
        return (False, 0.0, '')
    
    # Determine sub-type
    if shoulder_abd >= THRESHOLDS['groundstroke']['drive_min_shoulder']:
        sub_type = 'drive'
        confidence = 0.85
    else:
        sub_type = 'control'
        confidence = 0.80
    
    # Boost confidence with good hip rotation
    if hip_rotation >= THRESHOLDS['groundstroke']['min_hip_rotation']:
        confidence += 0.05
    
    # Determine forehand vs backhand (simplified)
    # In real implementation, would use shoulder positions
    if metrics.get('right_shoulder_x', 0.5) > metrics.get('left_shoulder_x', 0.5):
        sub_type = f'forehand_{sub_type}'
    else:
        sub_type = f'backhand_{sub_type}'
    
    return (True, min(confidence, 0.95), sub_type)


def classify_stroke_enhanced(
    metrics: Dict[str, Any],
    frame_history: List[Dict],
    position_data: Optional[Dict] = None
) -> Tuple[str, float, str]:
    """
    Enhanced stroke classification using research-based heuristics.
    
    Args:
        metrics: Current frame biomechanics metrics
        frame_history: Previous frames for motion analysis
        position_data: Optional court position data
    
    Returns:
        (stroke_type, confidence, sub_type)
    """
    
    # Priority order based on distinctiveness
    
    # 1. OVERHEAD - Most distinctive (wrist above head)
    is_oh, oh_conf = is_overhead(metrics)
    if is_oh:
        return ('overhead', oh_conf, 'smash')
    
    # 2. SERVE - Distinctive (below waist, upward motion)
    is_srv, srv_conf = is_serve(metrics, frame_history)
    if is_srv and srv_conf > 0.75:
        return ('serve', srv_conf, 'underhand')
    
    # 3. DINK - Distinctive (low shoulder, low body)
    is_dnk, dnk_conf, dnk_sub = is_dink(metrics, frame_history)
    if is_dnk and dnk_conf > 0.80:
        return ('dink', dnk_conf, dnk_sub)
    
    # 4. VOLLEY - Moderate shoulder, kitchen line
    is_vol, vol_conf, vol_sub = is_volley(metrics, position_data)
    if is_vol and vol_conf > 0.80:
        return ('volley', vol_conf, vol_sub)
    
    # 5. GROUNDSTROKE - Default for baseline shots
    is_gs, gs_conf, gs_sub = is_groundstroke(metrics)
    if is_gs:
        return ('groundstroke', gs_conf, gs_sub)
    
    # Fallback
    return ('groundstroke', 0.60, 'unknown')


def classify_frame(metrics: Dict[str, float], landmarks: Any) -> str:
    """
    Legacy compatibility function.
    Simplified classification for single frame without history.
    
    Returns: stroke_type string
    """
    # Use enhanced classification with empty history
    stroke_type, _, _ = classify_stroke_enhanced(metrics, [], None)
    return stroke_type
