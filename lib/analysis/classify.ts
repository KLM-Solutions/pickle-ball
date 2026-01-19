/**
 * Stroke classification heuristics
 * 
 * Ported from: Pickleball2/python/classification/heuristics.py
 * Lines: 102-434
 * 
 * IMPORTANT: Do NOT optimize or change thresholds. This is a mechanical port.
 * Priority order MUST be preserved: Overhead → Serve → Dink → Volley → Groundstroke
 */

import { StrokeType } from './types';
import { computeVelocity, countUpwardFrames } from './velocity';

// ============================================================================
// RESEARCH-BASED THRESHOLDS (Exact values from Python)
// ============================================================================

export const THRESHOLDS = {
    overhead: {
        min_shoulder_abduction: 110,      // High arm position
        min_wrist_above_nose: 0.05,       // Wrist clearly above head (normalized)
        confidence_high: 130,             // Very high shoulder for max confidence
    },
    serve: {
        // Position thresholds
        max_wrist_above_hip: 0.20,        // Wrist at/below waist (generous tolerance)
        min_shoulder_abduction: 20,       // Some arm extension
        max_shoulder_abduction: 100,      // Not overhead
        min_hip_rotation: 3,              // Minimal body rotation required
        // Velocity thresholds - LOWERED for normalized coords (0-1 space)
        min_wrist_velocity: 0.008,        // Normalized velocity per frame
        peak_velocity_threshold: 0.02,    // Peak velocity for strong serve
        // Temporal thresholds
        min_upward_frames: 2,             // Need sustained upward motion
    },
    groundstroke: {
        min_shoulder_abduction: 45,       // Moderate arm extension
        max_shoulder_abduction: 110,      // Below overhead
        min_hip_rotation: 10,             // Good rotation for power
        min_horizontal_velocity: 0.01,    // Side-to-side motion
    },
    volley: {
        min_shoulder_abduction: 30,
        max_shoulder_abduction: 85,
        max_wrist_velocity: 0.015,        // Compact motion
        punch_min_shoulder: 55,           // Punch volley threshold
    },
    dink: {
        max_shoulder_abduction: 55,       // Low arm position
        max_wrist_velocity: 0.012,        // Very soft touch
        min_knee_flexion: 15,             // Some knee bend
        max_knee_flexion: 70,             // Not too low
    },
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface ClassificationResult {
    strokeType: StrokeType | 'unknown';
    confidence: number;
    subType: string;
}

interface DetectionResult {
    match: boolean;
    confidence: number;
    subType?: string;
}

type FrameMetricsLike = Record<string, number | boolean | null | undefined>;

// ============================================================================
// STROKE DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect overhead smash.
 * 
 * Key criteria:
 * - Wrist ABOVE head (nose)
 * - High shoulder abduction (> 110°)
 * - Downward velocity at contact
 */
export function isOverhead(
    metrics: FrameMetricsLike,
    history: FrameMetricsLike[]
): DetectionResult {
    const wristY = (metrics.right_wrist_y as number) ?? 1.0;
    const noseY = (metrics.nose_y as number) ?? 0.5;
    const shoulderAbd = (metrics.right_shoulder_abduction as number) ?? 0;

    // Wrist above head check (y decreases upward)
    const wristAboveHead = (noseY - wristY) >= THRESHOLDS.overhead.min_wrist_above_nose;

    // High shoulder check
    const highShoulder = shoulderAbd >= THRESHOLDS.overhead.min_shoulder_abduction;

    if (wristAboveHead && highShoulder) {
        let confidence = 0.85;
        if (shoulderAbd >= THRESHOLDS.overhead.confidence_high) {
            confidence = 0.95;
        }
        return { match: true, confidence, subType: 'smash' };
    }

    return { match: false, confidence: 0 };
}

/**
 * Detect serve based on VELOCITY + POSITION.
 * 
 * Key criteria (ALL required for high confidence):
 * 1. Wrist at or below waist level
 * 2. UPWARD wrist velocity (the swing)
 * 3. Moderate shoulder abduction (20-100°)
 * 4. Hip rotation present (> 3°)
 */
export function isServe(
    metrics: FrameMetricsLike,
    history: FrameMetricsLike[]
): DetectionResult {
    const wristY = (metrics.right_wrist_y as number) ?? 0.5;
    const hipY = (metrics.right_hip_y as number) ?? 0.5;
    const shoulderAbd = (metrics.right_shoulder_abduction as number) ?? 0;
    const hipRotation = Math.abs((metrics.hip_rotation_deg as number) ?? 0);

    // 1. Position check: wrist at/below waist (with generous tolerance for follow-through)
    const wristHeightDiff = hipY - wristY; // positive = wrist above hip
    const wristAtWaist = wristHeightDiff <= THRESHOLDS.serve.max_wrist_above_hip;
    // Also allow wrist ABOVE waist during follow-through (wrist rising after contact)
    const wristDuringFollowthrough = wristY < hipY; // Wrist is above waist

    // 2. Shoulder in serve range (not overhead, not too low)
    const shoulderInRange =
        THRESHOLDS.serve.min_shoulder_abduction <= shoulderAbd &&
        shoulderAbd <= THRESHOLDS.serve.max_shoulder_abduction;

    // 3. Hip rotation check
    const hasHipRotation = hipRotation >= THRESHOLDS.serve.min_hip_rotation;

    // 4. VELOCITY check (CRITICAL)
    const prev = history.length > 0 ? history[history.length - 1] : null;
    const { velY, magnitude: velMag } = computeVelocity(metrics, prev, 'right_wrist_y', 'right_wrist_x', 'right_wrist_z');
    const isMovingUp = velY < -0.005; // Moving upward (negative y = up)
    const hasVelocity = velMag >= THRESHOLDS.serve.min_wrist_velocity;
    const hasStrongVelocity = velMag >= THRESHOLDS.serve.peak_velocity_threshold;

    // 5. Check if RECENT history had a serve-like peak (sticky detection)
    let recentHadServeVelocity = false;
    if (history.length >= 2) {
        // Check last 5 frames for high velocity
        const startIdx = Math.max(0, history.length - 5);
        for (let i = startIdx; i < history.length; i++) {
            if (i > 0) {
                const prevFrame = history[i];
                const earlierFrame = history[i - 1];
                const { magnitude: prevVelMag } = computeVelocity(prevFrame, earlierFrame, 'right_wrist_y', 'right_wrist_x', 'right_wrist_z');
                if (prevVelMag >= 0.015) {
                    recentHadServeVelocity = true;
                    break;
                }
            }
        }
    }

    // 6. Sustained upward motion check
    const allHistory = [...history, metrics];
    const upwardFrames = countUpwardFrames(allHistory, 'right_wrist_y');
    const sustainedUpward = upwardFrames >= THRESHOLDS.serve.min_upward_frames;

    // Scoring: Need multiple criteria to pass
    let score = 0;
    if (wristAtWaist) score += 1;
    if (shoulderInRange) score += 1;
    if (hasHipRotation) score += 1;
    if (isMovingUp) score += 2; // Double weight for upward motion (the key serve signature)
    if (hasVelocity) score += 1;
    if (sustainedUpward) score += 1;
    if (hasStrongVelocity) score += 2; // Double weight for strong velocity

    // STICKY: If recently had serve velocity AND wrist is in follow-through position
    if (recentHadServeVelocity && wristDuringFollowthrough && shoulderInRange) {
        score += 2; // Boost for follow-through phase
    }

    // Need at least 3 points to classify as serve
    if (score >= 3) {
        const confidence = Math.min(0.55 + (score - 3) * 0.06, 0.95);
        return { match: true, confidence, subType: 'underhand' };
    }

    return { match: false, confidence: 0 };
}

/**
 * Detect groundstroke (forehand/backhand drive).
 * 
 * Key criteria:
 * - Moderate shoulder abduction (45-110°)
 * - Hip rotation present (> 15°)
 * - Horizontal swing path
 */
export function isGroundstroke(
    metrics: FrameMetricsLike,
    history: FrameMetricsLike[]
): DetectionResult {
    const shoulderAbd = (metrics.right_shoulder_abduction as number) ?? 0;
    const hipRotation = Math.abs((metrics.hip_rotation_deg as number) ?? 0);

    // Shoulder range check
    const shoulderInRange =
        THRESHOLDS.groundstroke.min_shoulder_abduction <= shoulderAbd &&
        shoulderAbd <= THRESHOLDS.groundstroke.max_shoulder_abduction;

    if (!shoulderInRange) {
        return { match: false, confidence: 0 };
    }

    // Hip rotation check
    const hasHipRotation = hipRotation >= THRESHOLDS.groundstroke.min_hip_rotation;

    // Determine forehand vs backhand
    const rShoulderX = (metrics.right_shoulder_x as number) ?? 0.5;
    const lShoulderX = (metrics.left_shoulder_x as number) ?? 0.5;
    const isForehand = rShoulderX > lShoulderX;

    let confidence = 0.75;
    if (hasHipRotation) {
        confidence += 0.10;
    }

    let subType = isForehand ? 'forehand' : 'backhand';
    if (shoulderAbd >= 70) {
        subType += '_drive';
    } else {
        subType += '_control';
    }

    return { match: true, confidence: Math.min(confidence, 0.95), subType };
}

/**
 * Detect volley (punch or block).
 * 
 * Key criteria:
 * - Moderate shoulder abduction (30-80°)
 * - Compact motion (low velocity)
 * - At kitchen line (if position available)
 */
export function isVolley(
    metrics: FrameMetricsLike,
    history: FrameMetricsLike[]
): DetectionResult {
    const shoulderAbd = (metrics.right_shoulder_abduction as number) ?? 0;

    // Shoulder range check
    const shoulderInRange =
        THRESHOLDS.volley.min_shoulder_abduction <= shoulderAbd &&
        shoulderAbd <= THRESHOLDS.volley.max_shoulder_abduction;

    if (!shoulderInRange) {
        return { match: false, confidence: 0 };
    }

    // Velocity check (volleys are compact)
    const prev = history.length > 0 ? history[history.length - 1] : null;
    const { magnitude: velMag } = computeVelocity(metrics, prev, 'right_wrist_y', 'right_wrist_x', 'right_wrist_z');
    const isCompact = velMag <= THRESHOLDS.volley.max_wrist_velocity;

    if (!isCompact && history.length > 0) {
        return { match: false, confidence: 0 };
    }

    // Sub-type
    let subType: string;
    let confidence: number;
    if (shoulderAbd >= THRESHOLDS.volley.punch_min_shoulder) {
        subType = 'punch';
        confidence = 0.85;
    } else {
        subType = 'block';
        confidence = 0.80;
    }

    return { match: true, confidence: Math.min(confidence, 0.95), subType };
}

/**
 * Detect dink shot.
 * 
 * Key criteria:
 * - Low shoulder abduction (< 50°)
 * - Very low velocity (soft touch)
 * - Low body position (knee flexion)
 * - Wrist below waist
 */
export function isDink(
    metrics: FrameMetricsLike,
    history: FrameMetricsLike[]
): DetectionResult {
    const shoulderAbd = (metrics.right_shoulder_abduction as number) ?? 0;
    const kneeFlexion = (metrics.right_knee_flexion as number) ?? 180;
    const wristY = (metrics.right_wrist_y as number) ?? 0.5;
    const hipY = (metrics.right_hip_y as number) ?? 0.5;

    // Low shoulder check
    const lowShoulder = shoulderAbd <= THRESHOLDS.dink.max_shoulder_abduction;


    // Velocity check (soft touch)
    const prev = history.length > 0 ? history[history.length - 1] : null;
    const { magnitude: velMag } = computeVelocity(metrics, prev, 'right_wrist_y', 'right_wrist_x', 'right_wrist_z');
    const softTouch = velMag <= THRESHOLDS.dink.max_wrist_velocity;


    // Low body check
    const lowBody =
        THRESHOLDS.dink.min_knee_flexion <= kneeFlexion &&
        kneeFlexion <= THRESHOLDS.dink.max_knee_flexion;

    // Contact point check
    const wristBelowWaist = wristY >= hipY;

    // Need multiple criteria
    let score = 0;
    if (lowShoulder) score += 1;
    if (softTouch) score += 2; // Double weight
    if (lowBody) score += 1;
    if (wristBelowWaist) score += 1;

    if (score >= 3) {
        const confidence = Math.min(0.70 + (score - 3) * 0.08, 0.95);
        return { match: true, confidence, subType: 'soft_game' };
    }

    return { match: false, confidence: 0 };
}

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Enhanced stroke classification using velocity + position heuristics.
 * 
 * Priority order (most distinctive first):
 * 1. Overhead (wrist above head)
 * 2. Serve (upward velocity + waist contact)
 * 3. Dink (soft touch + low position)
 * 4. Volley (compact punch)
 * 5. Groundstroke (default for baseline shots)
 * 
 * @param metrics - Current frame metrics
 * @param history - Previous frame metrics (up to 10 frames)
 * @param targetType - Optional hint for expected stroke type
 */
export function classifyStroke(
    metrics: FrameMetricsLike,
    history: FrameMetricsLike[],
    targetType?: StrokeType | string
): ClassificationResult {
    // 1. OVERHEAD - Most distinctive
    const overhead = isOverhead(metrics, history);
    if (overhead.match && overhead.confidence >= 0.80) {
        return { strokeType: 'overhead', confidence: overhead.confidence, subType: overhead.subType || 'smash' };
    }

    // 2. SERVE - Check with velocity
    const serve = isServe(metrics, history);

    if (targetType === 'serve') {
        // Serve videos must be STRICT to avoid flagging "walking/ready stance" as serves.
        if (serve.match && serve.confidence >= 0.75) {
            return { strokeType: 'serve', confidence: Math.max(serve.confidence, 0.85), subType: 'underhand' };
        }
    } else {
        // Strict mode
        if (serve.match && serve.confidence >= 0.75) {
            return { strokeType: 'serve', confidence: serve.confidence, subType: 'underhand' };
        }
    }

    // 3. DINK - Low, soft shots (SKIP if target is serve)
    if (targetType !== 'serve') {
        const dink = isDink(metrics, history);

        if (targetType === 'dink') {
            if (dink.match && dink.confidence >= 0.70) {
                return { strokeType: 'dink', confidence: Math.max(dink.confidence, 0.80), subType: dink.subType || 'soft_game' };
            }
        } else {
            if (dink.match && dink.confidence >= 0.75) {
                return { strokeType: 'dink', confidence: dink.confidence, subType: dink.subType || 'soft_game' };
            }
        }
    }

    // 4. VOLLEY - Compact punch (SKIP if target is serve)
    if (targetType !== 'serve') {
        const volley = isVolley(metrics, history);
        if (volley.match && volley.confidence >= 0.75) {
            return { strokeType: 'volley', confidence: volley.confidence, subType: volley.subType || 'punch' };
        }
    }

    // 5. GROUNDSTROKE - Default for baseline (SKIP if target is serve)
    if (targetType !== 'serve') {
        const gs = isGroundstroke(metrics, history);

        if (targetType === 'groundstroke' || targetType === 'drive') {
            if (gs.match) {
                return { strokeType: 'groundstroke', confidence: Math.max(gs.confidence, 0.80), subType: gs.subType || 'forehand' };
            }
        } else {
            if (gs.match) {
                return { strokeType: 'groundstroke', confidence: gs.confidence, subType: gs.subType || 'forehand' };
            }
        }
    }

    // Default fallback
    return { strokeType: 'unknown', confidence: 0.40, subType: 'unclassified' };
}
