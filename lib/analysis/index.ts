/**
 * Main analysis module - orchestrates all biomechanics analysis
 * 
 * Usage:
 * import { analyzeFrames } from '@/lib/analysis';
 * const result = analyzeFrames(rawFrames, 'serve', jobId, videoUrl);
 */

import { calculateMetrics } from './angles';
import { detectRisks, calculateRiskPercentages, getOverallRisk, filterSustainedRisks } from './risk';
import { generateFeedback } from './feedback';
import { detectStrokes } from './segmentation';
import {
  RawFrame,
  AnalyzedFrame,
  AnalysisResult,
  AnalysisSummary,
  StrokeType,
  FrameMetrics,
} from './types';

// Re-export types for convenience
export * from './types';
export { calculateMetrics } from './angles';
export { detectRisks } from './risk';
export { generateFeedback } from './feedback';
export {
  filterFramesForIssues,
  getKeyFramesByIssue,
  getFilterSummary,
  getTopIssues,
  getFullRecommendation,
  type FilteredFrame,
  type FrameIssue,
  type FilterSummary,
  type KeyIssue,
  type IssueType,
} from './filter';

// Export recommendations module
export {
  getEnhancedRecommendation,
  getRecommendationsForIssues,
  getQuickRecommendation,
  getDrillForIssue,
  getAllIssueTypes,
  type RecommendationTemplate,
  type CoachingRecommendation,
} from './recommendations';

// Export stroke detection module
export {
  detectStrokes,
  detectSegments,
  type StrokeSegment,
} from './segmentation';
export { classifyStroke, THRESHOLDS } from './classify';

/**
 * Analyze all frames and generate complete analysis result
 * 
 * @param rawFrames - Raw frames from Python track.py output
 * @param strokeType - Type of stroke being analyzed
 * @param jobId - Job ID for reference
 * @param videoUrl - URL of the annotated video
 * @param fps - Frames per second (optional, will estimate from timestamps)
 * @returns Complete analysis result ready for storage
 */
export function analyzeFrames(
  rawFrames: RawFrame[],
  strokeType: StrokeType | string,
  jobId: string,
  videoUrl: string,
  fps?: number
): AnalysisResult {
  const stroke = strokeType as StrokeType;

  // Calculate FPS from frames if not provided (need it early for velocity)
  const calculatedFps = fps || estimateFps(rawFrames);

  // Analyze each frame
  const analyzedFrames: AnalyzedFrame[] = rawFrames.map((frame, index) => {
    // Calculate metrics from landmarks
    const baseMetrics = frame.landmarks
      ? calculateMetrics(frame.landmarks)
      : {
        right_elbow_flexion: null,
        left_elbow_flexion: null,
        right_knee_flexion: null,
        left_knee_flexion: null,
        right_shoulder_abduction: null,
        left_shoulder_abduction: null,
        hip_rotation_deg: null,
        wrist_above_waist: false,
        wrist_above_head: false,
        nose_y: null,
        nose_z: undefined,
        right_wrist_y: null,
        right_wrist_x: undefined,
        right_wrist_z: undefined,
        left_wrist_x: undefined,
        left_wrist_z: undefined,
        right_hip_y: null,
        right_hip_z: undefined,
        left_hip_z: undefined,
        right_shoulder_x: undefined,
        right_shoulder_z: undefined,
        left_shoulder_x: undefined,
        left_shoulder_z: undefined,
        spinal_flexion: null,
      };

    // Enrich metrics with frame timing for segmentation
    const metrics: FrameMetrics = {
      ...baseMetrics,
      frame_idx: frame.frameIdx,
      time_sec: frame.timestampSec,
    };

    // Detect injury risks
    const { risks, level } = detectRisks(metrics, stroke);

    // Generate feedback
    const feedback = frame.landmarks
      ? generateFeedback(metrics, stroke)
      : [];

    return {
      frameIdx: frame.frameIdx,
      timestampSec: frame.timestampSec,
      bbox: frame.bbox,
      confidence: frame.confidence,
      track_id: frame.track_id,
      metrics,
      injury_risk: level,
      injury_risks: risks,
      feedback,
    };
  });

  // Filter for sustained risks (Confidence Interval)
  filterSustainedRisks(analyzedFrames, 3);

  // Calculate duration
  const duration = rawFrames.length > 0
    ? rawFrames[rawFrames.length - 1].timestampSec
    : 0;

  // Calculate risk percentages
  const riskPercentages = calculateRiskPercentages(analyzedFrames);

  // Determine overall risk
  const overallRisk = getOverallRisk(riskPercentages);

  // Build summary
  const summary: AnalysisSummary = {
    total_frames: rawFrames.length,
    analyzed_frames: analyzedFrames.filter(f => f.metrics.right_elbow_flexion !== null).length,
    fps: calculatedFps,
    duration_sec: Math.round(duration * 100) / 100,
    stroke_type: strokeType,
    overall_risk: overallRisk,
    risk_percentages: riskPercentages,
  };

  // NEW: Detect strokes from analyzed frames
  const metricsForSegmentation = analyzedFrames.map(f => f.metrics);
  const strokes = detectStrokes(metricsForSegmentation, stroke, calculatedFps);

  return {
    job_id: jobId,
    stroke_type: strokeType,
    videoUrl,
    frames: analyzedFrames,
    summary,
    strokes,  // NEW: Include detected stroke segments
  };
}

/**
 * Estimate FPS from frame timestamps
 */
function estimateFps(frames: RawFrame[]): number {
  if (frames.length < 2) return 30; // Default

  // Calculate average time between frames
  let totalDelta = 0;
  let count = 0;

  for (let i = 1; i < Math.min(frames.length, 30); i++) {
    const delta = frames[i].timestampSec - frames[i - 1].timestampSec;
    if (delta > 0) {
      totalDelta += delta;
      count++;
    }
  }

  if (count === 0) return 30;

  const avgDelta = totalDelta / count;
  return Math.round(1 / avgDelta);
}

/**
 * Quick analysis for a single frame (useful for real-time display)
 */
export function analyzeFrame(
  frame: RawFrame,
  strokeType: StrokeType | string
): AnalyzedFrame {
  const stroke = strokeType as StrokeType;

  const metrics = frame.landmarks
    ? calculateMetrics(frame.landmarks)
    : {
      right_elbow_flexion: null,
      left_elbow_flexion: null,
      right_knee_flexion: null,
      left_knee_flexion: null,
      right_shoulder_abduction: null,
      left_shoulder_abduction: null,
      hip_rotation_deg: null,
      wrist_above_waist: false,
      wrist_above_head: false,
      nose_y: null,
      nose_z: undefined,
      right_wrist_y: null,
      right_wrist_x: undefined,
      right_wrist_z: undefined,
      left_wrist_x: undefined,
      left_wrist_z: undefined,
      right_hip_y: null,
      right_hip_z: undefined,
      left_hip_z: undefined,
      right_shoulder_x: undefined,
      right_shoulder_z: undefined,
      left_shoulder_x: undefined,
      left_shoulder_z: undefined,
    };

  const { risks, level } = detectRisks(metrics, stroke);
  const feedback = frame.landmarks ? generateFeedback(metrics, stroke) : [];

  return {
    frameIdx: frame.frameIdx,
    timestampSec: frame.timestampSec,
    bbox: frame.bbox,
    confidence: frame.confidence,
    track_id: frame.track_id,
    metrics,
    injury_risk: level,
    injury_risks: risks,
    feedback,
  };
}

