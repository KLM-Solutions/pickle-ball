/**
 * Temporal segmentation and stroke detection
 * 
 * Ported from:
 * - Pickleball2/python/classification/classifier.py (detect_segments)
 * - Pickleball2/python/track.py (post-processing: lines 966-1077)
 * 
 * IMPORTANT: Do NOT optimize or change thresholds. This is a mechanical port.
 */

import { StrokeType, FrameMetrics, RallyState, createInitialRallyState } from './types';
import { classifyStroke, ClassificationResult } from './classify';
import { computeVelocity, isVelocityPeakConfirmed } from './velocity';

// ============================================================================
// TYPES
// ============================================================================

export interface StrokeSegment {
    strokeType: StrokeType | 'unknown';
    startFrame: number;
    endFrame: number;
    startSec: number;
    endSec: number;
    peakFrameIdx: number;
    peakTimestamp: number;
    peakVelocity: number;
    confidence: number;
}

interface RawSegment {
    strokeType: StrokeType | 'unknown';
    startFrame: number;
    endFrame: number;
    confidence: number;
}

interface SegmentConfig {
    min_conf: number;
    min_peak_v: number;
    min_len_frames: number;
    cooldown_sec: number;
}

type FrameMetricsLike = Record<string, number | boolean | null | undefined> & {
    frame_idx?: number;
    time_sec?: number;
};

// ============================================================================
// SEGMENTATION CONFIG (Exact values from track.py)
// ============================================================================

export const SEGMENT_CONFIG: Record<string, SegmentConfig> = {
    serve: { min_conf: 0.65, min_peak_v: 0.12, min_len_frames: 4, cooldown_sec: 1.0 }, // Lower floor for slower serves
    groundstroke: { min_conf: 0.72, min_peak_v: 0.16, min_len_frames: 4, cooldown_sec: 0.8 },
    drive: { min_conf: 0.72, min_peak_v: 0.16, min_len_frames: 4, cooldown_sec: 0.8 },
    volley: { min_conf: 0.75, min_peak_v: 0.10, min_len_frames: 3, cooldown_sec: 0.6 },
    dink: { min_conf: 0.72, min_peak_v: 0.06, min_len_frames: 3, cooldown_sec: 0.6 },
    overhead: { min_conf: 0.80, min_peak_v: 0.14, min_len_frames: 3, cooldown_sec: 1.0 },
};

const DEFAULT_CONFIG: SegmentConfig = { min_conf: 0.75, min_peak_v: 0.10, min_len_frames: 3, cooldown_sec: 0.8 };

// ============================================================================
// SEGMENTATION CONSTANTS
// ============================================================================

const MIN_SEGMENT_FRAMES = 3;      // Minimum frames for valid segment
const GAP_MERGE_THRESHOLD = 3;     // Merge segments if gap <= this
const HISTORY_BUFFER_SIZE = 10;    // Number of frames to keep in history
const RALLY_END_LOW_VEL_THRESHOLD = 0.015; // Velocity below this = idle
const RALLY_END_IDLE_FRAMES = 60;  // ~2 sec at 30fps = rally end

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect temporal segments where specific strokes occur.
 * Uses velocity-aware classification with frame history.
 * 
 * Ported from: StrokeClassifier.detect_segments
 */
export function detectSegments(
    framesMetrics: FrameMetricsLike[],
    targetType?: StrokeType | string
): RawSegment[] {
    const segments: RawSegment[] = [];
    if (!framesMetrics || framesMetrics.length === 0) {
        return segments;
    }

    let currentType: StrokeType | 'unknown' | null = null;
    let startFrame = 0;
    let confMax = 0;
    let history: FrameMetricsLike[] = [];

    // Process each frame with history for velocity tracking
    for (let i = 0; i < framesMetrics.length; i++) {
        const metric = framesMetrics[i];

        // Use enhanced classification with history
        const result: ClassificationResult = classifyStroke(metric, history, targetType);
        const strokeType = result.strokeType;
        const conf = result.confidence;
        const frameIdx = (metric.frame_idx as number) ?? i;

        // Update history
        history.push(metric);
        if (history.length > HISTORY_BUFFER_SIZE) {
            history = history.slice(-HISTORY_BUFFER_SIZE);
        }

        // If type changes, finalize previous segment
        if (strokeType !== currentType) {
            if (currentType !== null) {
                const prevMetric = framesMetrics[i - 1] || metric;
                const endFrame = (prevMetric.frame_idx as number) ?? (frameIdx - 1);

                // End of segment
                segments.push({
                    startFrame: startFrame,
                    endFrame: endFrame,
                    strokeType: currentType,
                    confidence: confMax,
                });
            }

            // Start new segment
            currentType = strokeType;
            startFrame = frameIdx;
            confMax = conf;
        } else {
            // Accumulate max confidence within the current segment
            confMax = Math.max(confMax, conf);
        }
    }

    // Finalize last segment
    if (currentType !== null) {
        const lastMetric = framesMetrics[framesMetrics.length - 1];
        const endFrame = (lastMetric.frame_idx as number) ?? (framesMetrics.length - 1);

        segments.push({
            startFrame: startFrame,
            endFrame: endFrame,
            strokeType: currentType,
            confidence: confMax,
        });
    }

    // Filter out very short segments (< 3 frames) and None/unknown types
    const validSegments = segments.filter(
        s =>
            s.strokeType !== null &&
            s.strokeType !== 'unknown' &&
            (s.endFrame - s.startFrame + 1) >= MIN_SEGMENT_FRAMES
    );

    // MERGE nearby segments of the same type (gap <= 3 frames)
    const merged: RawSegment[] = [];
    for (const seg of validSegments) {
        if (merged.length > 0 && merged[merged.length - 1].strokeType === seg.strokeType) {
            const gap = seg.startFrame - merged[merged.length - 1].endFrame - 1;
            if (gap <= GAP_MERGE_THRESHOLD) {
                merged[merged.length - 1].endFrame = seg.endFrame;
                merged[merged.length - 1].confidence = Math.max(
                    merged[merged.length - 1].confidence,
                    seg.confidence
                );
                continue;
            }
        }
        merged.push({ ...seg });
    }

    return merged;
}

/**
 * Find the peak velocity within a segment.
 * 
 * Ported from: track.py lines 991-1011
 */
export function findPeakVelocity(
    segment: RawSegment,
    allMetrics: FrameMetricsLike[],
    fps: number
): { peakFrameIdx: number; peakTimestamp: number; peakVelocity: number } {
    const sStart = segment.startFrame;
    const sEnd = segment.endFrame;
    let maxV = 0;
    let maxVFrame = sStart;

    // Scan frames in this segment
    for (let i = 0; i < allMetrics.length; i++) {
        const m = allMetrics[i];
        const fIdx = (m.frame_idx as number) ?? i;

        if (fIdx >= sStart && fIdx <= sEnd) {
            // Get velocity magnitude (use pre-computed if available, else compute)
            let v = (m.wrist_velocity_mag as number) ?? 0;

            // If not pre-computed, calculate from previous frame
            if (v === 0 && i > 0) {
                const prev = allMetrics[i - 1];
                const { magnitude } = computeVelocity(m, prev, 'right_wrist_y', 'right_wrist_x', 'right_wrist_z');
                v = magnitude * fps; // Scale to per-second
            }

            if (v > maxV) {
                maxV = v;
                maxVFrame = fIdx;
            }
        }
    }

    return {
        peakFrameIdx: maxVFrame,
        peakTimestamp: Math.round((maxVFrame / fps) * 1000) / 1000,
        peakVelocity: Math.round(maxV * 100) / 100,
    };
}

/**
 * Filter segments based on stroke-specific thresholds.
 * Enhanced with rally-aware serve locking and peak confirmation.
 * 
 * Ported from: track.py lines 1028-1077
 */
export function filterSegments(
    segments: RawSegment[],
    allMetrics: FrameMetricsLike[],
    strokeKey: string,
    fps: number,
    coarseMode: boolean = false,
    rallyState?: RallyState
): StrokeSegment[] {
    let cfg = SEGMENT_CONFIG[strokeKey.toLowerCase()] || DEFAULT_CONFIG;

    if (coarseMode) {
        // Coarse pass: more lenient to find candidate windows
        cfg = {
            ...cfg,
            min_conf: Math.max(0.55, cfg.min_conf - 0.18),
            min_peak_v: Math.max(0, cfg.min_peak_v * 0.5),
            cooldown_sec: 0,
        };
    }

    const cooldownFrames = Math.floor(cfg.cooldown_sec * fps);
    const filtered: StrokeSegment[] = [];

    // Initialize rally state if not provided
    const state: RallyState = rallyState || createInitialRallyState();

    // Sort by start frame
    const sorted = [...segments].sort((a, b) => a.startFrame - b.startFrame);

    for (const s of sorted) {
        // === NEW: Rally End Detection ===
        // If there's a significant gap since the last stroke, check if the rally ended.
        if (state.lastStrokeFrame > 0) {
            const gapFrames = s.startFrame - state.lastStrokeFrame;

            // If gap is large enough to potentially be a rally break
            if (gapFrames > RALLY_END_IDLE_FRAMES) {
                // Check velocity in the gap
                let isIdle = true;
                const checkStart = state.lastStrokeFrame + 5; // buffer
                const checkEnd = s.startFrame - 5;            // buffer

                // If gap is huge (> 5s), assume new rally without checking every frame
                if (gapFrames > 150) {
                    isIdle = true;
                } else if (checkEnd > checkStart) {
                    // Check if velocity remained low
                    let highVelFrames = 0;
                    for (let i = checkStart; i < checkEnd; i += 2) { // sample every 2nd frame
                        const m = allMetrics[i];
                        // Use pre-computed mag if available, else approximate
                        const v = (m.wrist_velocity_mag as number) ?? 0;
                        if (v > RALLY_END_LOW_VEL_THRESHOLD * 2) {
                            highVelFrames++;
                        }
                    }
                    // If too much activity in the gap, it wasn't a rally end (just a lull)
                    if (highVelFrames > (checkEnd - checkStart) * 0.1) {
                        isIdle = false;
                    }
                }

                if (isIdle) {
                    // Rally ended! Reset state.
                    state.serveUsed = false;
                    state.phase = 'pre-rally';
                    state.lastStrokeFrame = -1; // Reset to avoid double-resetting
                }
            }
        }

        const segLen = s.endFrame - s.startFrame + 1;

        // Min length check
        if (segLen < cfg.min_len_frames) {
            continue;
        }

        // Min confidence check
        if (s.confidence < cfg.min_conf) {
            continue;
        }

        // Find peak velocity for this segment
        const peak = findPeakVelocity(s, allMetrics, fps);

        // Min peak velocity check
        if (peak.peakVelocity < cfg.min_peak_v) {
            continue;
        }

        // === NEW: Velocity peak confirmation (peak + deceleration) ===
        // Build velocity curve for this segment window
        const velocities: number[] = [];
        let peakIdxInWindow = 0;
        for (let i = s.startFrame; i <= Math.min(s.endFrame + 3, allMetrics.length - 1); i++) {
            const metric = allMetrics[i];
            const prev = i > 0 ? allMetrics[i - 1] : null;
            const vel = computeVelocity(
                metric,
                prev,
                'right_wrist_y',
                'right_wrist_x',
                'right_wrist_z'
            );
            velocities.push(vel.magnitude);
            if (i === peak.peakFrameIdx) {
                peakIdxInWindow = velocities.length - 1;
            }
        }

        // Confirm peak has proper deceleration
        // Serves are smoother, so allow a lower drop percentage (25%).
        // Drives/Volleys are sharper, so require standard 40%.
        const minDrop = s.strokeType === 'serve' ? 0.25 : 0.40;

        if (!isVelocityPeakConfirmed(velocities, peakIdxInWindow, minDrop)) {
            // Skip: likely prep or follow-through, not a complete stroke
            continue;
        }

        // === NEW: Rally-aware serve lock ===
        if (s.strokeType === 'serve') {
            if (state.serveUsed) {
                // Serve already used in this rally - REJECT
                continue;
            }
            // Mark serve as used (first serve confirmed)
            state.serveUsed = true;
            state.phase = 'active-rally';
            state.rallyStartFrame = s.startFrame;
        }

        // Cooldown: prevent duplicates around the same physical hit
        if (cooldownFrames > 0 && filtered.length > 0) {
            const prevEnd = filtered[filtered.length - 1].endFrame;
            if (s.startFrame <= prevEnd + cooldownFrames) {
                continue;
            }
        }

        // Update rally state
        state.lastStrokeFrame = s.endFrame;
        state.lastStrokeType = s.strokeType === 'unknown' ? null : s.strokeType;
        state.cooldownEndFrame = s.endFrame + cooldownFrames;

        // Add to filtered results
        filtered.push({
            strokeType: s.strokeType,
            startFrame: s.startFrame,
            endFrame: s.endFrame,
            startSec: Math.round((s.startFrame / fps) * 100) / 100,
            endSec: Math.round((s.endFrame / fps) * 100) / 100,
            peakFrameIdx: peak.peakFrameIdx,
            peakTimestamp: peak.peakTimestamp,
            peakVelocity: peak.peakVelocity,
            confidence: Math.round(s.confidence * 1000) / 1000,
        });
    }

    return filtered;
}

/**
 * Main stroke detection orchestrator.
 * Combines segmentation, peak detection, and filtering.
 * 
 * @param frames - Array of frame metrics with frame_idx and time_sec
 * @param targetType - Expected stroke type for targeted filtering
 * @param fps - Frames per second of the video
 * @param coarseMode - If true, use lenient thresholds
 */
export function detectStrokes(
    frames: FrameMetricsLike[],
    targetType: StrokeType | string,
    fps: number,
    coarseMode: boolean = false
): StrokeSegment[] {
    // Step 1: Detect raw segments
    const rawSegments = detectSegments(frames, targetType);

    // Step 2: Strict filtering - only keep segments matching the user's selection
    const strokeKey = targetType.toLowerCase();
    let matchingSegments: RawSegment[];

    if (strokeKey && !['overall', 'none', ''].includes(strokeKey)) {
        matchingSegments = rawSegments.filter(
            s => s.strokeType.toLowerCase() === strokeKey
        );
    } else {
        matchingSegments = rawSegments;
    }

    // Step 3: Apply filtering with cooldown, peak detection, and rally state
    // RallyState is created fresh per detectStrokes call (single rally assumed per call)
    // For multi-rally videos, caller should split frames by rally boundaries
    const rallyState = createInitialRallyState();
    const finalStrokes = filterSegments(matchingSegments, frames, strokeKey, fps, coarseMode, rallyState);

    return finalStrokes;
}
