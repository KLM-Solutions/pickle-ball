/**
 * Injury risk detection based on biomechanics thresholds
 * 
 * Research-based thresholds:
 * - Shoulder abduction >140° = high risk (except overhead)
 * - Poor kinetic chain (no hip rotation) = elbow/back strain
 * - Excessive knee flexion >90° = patellar stress
 */

import { FrameMetrics, InjuryRisk, RiskLevel, StrokeType } from './types';

// Thresholds based on biomechanics research - Red/Yellow/Green levels
// Thresholds based on biomechanics research - Red/Yellow/Green levels
// Verified against Linear Ticket: [Biomechanics Thresholds]
const THRESHOLDS = {
  shoulder: {
    // Acceptance Criteria: Shoulder abduction thresholds
    caution: 90,    // Medium Risk (Green -> Yellow)
    high_risk: 140, // High Risk (Yellow -> Red) - Rotator cuff impingement zone
  },
  elbow: {
    // Acceptance Criteria: Elbow hyperextension thresholds
    extension_caution: 170, // Medium Risk
    extension_risk: 180,    // High Risk - Hyperextension limit
  },
  knee: {
    // Acceptance Criteria: Knee flexion extremes
    flexion_caution: 120, // Medium Risk start
    flexion_risk: 90,     // High Risk - Patellofemoral compression zone
    locked_risk: 175,     // High Risk - Locked knee under load
  },
  spine: {
    // Acceptance Criteria: Spinal flexion (Lower back)
    flexion_caution: 30, // Updated to 30 to match Linear/Python
    flexion_risk: 45,    // High Risk - Disc compression zone
  },
  hip_rotation: {
    power_minimum: 30, // Kinetic Chain efficiency
  },
};

/**
 * Detect injury risks for a single frame
 * Confidence Interval: This function is called frame-by-frame. 
 * Aggregation logic (in summary) should handle the 'sustained' check.
 */
export function detectRisks(
  metrics: FrameMetrics,
  strokeType: StrokeType
): { risks: InjuryRisk[]; level: RiskLevel } {
  const risks: InjuryRisk[] = [];

  // 1. SHOULDER OVERUSE (Rotator Cuff Risk)
  const shoulderAngle = metrics.right_shoulder_abduction || 0;
  if (strokeType !== 'overhead' && shoulderAngle > THRESHOLDS.shoulder.caution) {
    const severity: RiskLevel = shoulderAngle > THRESHOLDS.shoulder.high_risk ? 'high' : 'medium';
    risks.push({
      type: 'shoulder_overuse',
      severity,
      angle: shoulderAngle,
      message: severity === 'high' ? 'High Risk: Excessive shoulder abduction' : 'Caution: High shoulder abduction',
      recommendation: 'Keep shoulder abduction below 140° to avoid impingement.',
    });
  }

  // 2. ELBOW HYPEREXTENSION (Tennis Elbow Risk)
  const elbowAngle = metrics.right_elbow_flexion || 0;
  if (elbowAngle > THRESHOLDS.elbow.extension_caution) {
    const severity: RiskLevel = elbowAngle > THRESHOLDS.elbow.extension_risk ? 'high' : 'medium';
    risks.push({
      type: 'elbow_strain',
      severity,
      angle: elbowAngle,
      message: severity === 'high' ? 'High Risk: Elbow hyperextension' : 'Caution: Near elbow hyperextension',
      recommendation: 'Maintain a soft micro-bend in the elbow at contact.',
    });
  }

  // 3. KNEE STRESS (Patellar/Meniscus Risk)
  const kneeAngle = metrics.right_knee_flexion || 180;
  if (kneeAngle < THRESHOLDS.knee.flexion_caution || kneeAngle > THRESHOLDS.knee.locked_risk) {
    const isRed = kneeAngle < THRESHOLDS.knee.flexion_risk || kneeAngle > THRESHOLDS.knee.locked_risk;
    const severity: RiskLevel = isRed ? 'high' : 'medium';
    risks.push({
      type: 'knee_stress',
      severity,
      angle: kneeAngle,
      message: kneeAngle < 100 ? 'Deep knee flexion stress' : 'Knee locked under load',
      recommendation: 'Maintain athletic stance: knee angle 110-160° is optimal.',
    });
  }

  // 4. SPINAL FLEXION (Lower Back Risk)
  const spinalFlexion = metrics.spinal_flexion || 0;
  if (spinalFlexion > THRESHOLDS.spine.flexion_caution) {
    const severity: RiskLevel = spinalFlexion > THRESHOLDS.spine.flexion_risk ? 'high' : 'medium';
    risks.push({
      type: 'spine_stress',
      severity,
      angle: spinalFlexion,
      message: severity === 'high' ? 'High Risk: Excessive forward lean' : 'Caution: Moderate forward lean',
      recommendation: 'Keep back straight and chest up. Bend from the knees, not the waist.',
    });
  }

  // 5. POOR KINETIC CHAIN
  const hipRotation = metrics.hip_rotation_deg || 0;
  const isPowerStroke = ['groundstroke', 'serve', 'overhead'].includes(strokeType);
  if (isPowerStroke && hipRotation < THRESHOLDS.hip_rotation.power_minimum) {
    risks.push({
      type: 'poor_kinetic_chain',
      severity: 'medium',
      angle: hipRotation,
      message: 'Low hip rotation - high arm strain',
      recommendation: 'Engage your core and hips to generate power safely.',
    });
  }

  // Overall frame level
  let level: RiskLevel = 'low';
  if (risks.some(r => r.severity === 'high')) level = 'high';
  else if (risks.some(r => r.severity === 'medium')) level = 'medium';

  return { risks, level };
}

/**
 * Filter risks to only those that are sustained over multiple frames
 * This implements the "Confidence Interval" (min violations before alerting)
 * Default: 3 consecutive frames (approx 0.1s at 30fps)
 */
export function filterSustainedRisks(
  frames: { frameIdx: number; injury_risks: InjuryRisk[] }[],
  minFrames: number = 3
): void {
  const riskTypes = ['shoulder_overuse', 'poor_kinetic_chain', 'knee_stress', 'elbow_strain', 'spine_stress'];

  riskTypes.forEach(type => {
    let sustainedStart = -1;
    let count = 0;

    for (let i = 0; i < frames.length; i++) {
      const hasRisk = frames[i].injury_risks.some(r => r.type === type);

      if (hasRisk) {
        if (sustainedStart === -1) sustainedStart = i;
        count++;
      } else {
        // If we didn't hit the minimum, remove the risks from previous frames
        if (count > 0 && count < minFrames) {
          for (let j = sustainedStart; j < i; j++) {
            frames[j].injury_risks = frames[j].injury_risks.filter(r => r.type !== type);
          }
        }
        sustainedStart = -1;
        count = 0;
      }
    }

    // Check end of array
    if (count > 0 && count < minFrames) {
      for (let j = sustainedStart; j < frames.length; j++) {
        frames[j].injury_risks = frames[j].injury_risks.filter(r => r.type !== type);
      }
    }
  });
}

/**
 * Calculate risk percentages for session summary
 */
export function calculateRiskPercentages(
  frames: { injury_risks: InjuryRisk[] }[]
): { shoulder_overuse: number; poor_kinetic_chain: number; knee_stress: number; spine_stress: number } {
  const totalFrames = frames.length;

  if (totalFrames === 0) {
    return { shoulder_overuse: 0, poor_kinetic_chain: 0, knee_stress: 0, spine_stress: 0 };
  }

  const counts: Record<string, number> = {
    shoulder_overuse: 0,
    poor_kinetic_chain: 0,
    knee_stress: 0,
    spine_stress: 0,
    elbow_strain: 0
  };

  frames.forEach(frame => {
    // Only count unique risk types per frame
    const typesInFrame = new Set(frame.injury_risks.map(r => r.type));
    typesInFrame.forEach(type => {
      if (counts[type] !== undefined) counts[type]++;
    });
  });

  return {
    shoulder_overuse: Math.round((counts.shoulder_overuse / totalFrames) * 100 * 10) / 10,
    poor_kinetic_chain: Math.round((counts.poor_kinetic_chain / totalFrames) * 100 * 10) / 10,
    knee_stress: Math.round((counts.knee_stress / totalFrames) * 100 * 10) / 10,
    spine_stress: Math.round((counts.spine_stress / totalFrames) * 100 * 10) / 10,
  };
}

/**
 * Determine overall session risk level
 */
export function getOverallRisk(
  percentages: { shoulder_overuse: number; poor_kinetic_chain: number; knee_stress: number; spine_stress: number }
): RiskLevel {
  const { shoulder_overuse, poor_kinetic_chain, knee_stress, spine_stress } = percentages;

  // High if any critical issue > 8% (lowered from 10% because we filtered transients)
  if (shoulder_overuse > 8 || spine_stress > 15) return 'high';
  if (poor_kinetic_chain > 25 && knee_stress > 20) return 'high';

  // Medium if any issues > 3%
  if (shoulder_overuse > 3 || poor_kinetic_chain > 10 || knee_stress > 8 || spine_stress > 5) {
    return 'medium';
  }

  return 'low';
}
