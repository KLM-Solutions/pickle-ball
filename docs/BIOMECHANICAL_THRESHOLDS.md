# Biomechanical Injury Risk Thresholds Documentation

**Status**: ✅ 4/5 thresholds implemented | ⚠️ 1 gap (spinal flexion)
**Last Updated**: January 2026
**Expert Validation**: Pending - needs sports medicine/PT review

---

## Overview

This document details the biomechanical thresholds used by Strike Sense to detect injury risk during pickleball analysis. The thresholds are designed to be **conservative** - better to under-alert than over-alert and create anxiety.

## Implementation Files

| Component | File Path | Description |
|-----------|-----------|-------------|
| Python Thresholds | `python/biomechanics/angles.py` | Core threshold definitions |
| Python Risk Detection | `python/biomechanics/injury_risk.py` | Frame-by-frame & session analysis |
| TypeScript Filtering | `lib/analysis/filter.ts` | Stroke-specific thresholds |
| TypeScript Recommendations | `lib/analysis/recommendations.ts` | Coaching templates |

---

## 1. Shoulder Abduction (Rotator Cuff Risk) ✅

**File**: `python/biomechanics/angles.py:10-16`

### Threshold Levels

| Level | Angle Range | Color | Risk Description |
|-------|-------------|-------|------------------|
| **Safe** | 0° - 120° | 🟢 Green | Normal range, no concern |
| **Caution** | 120° - 140° | 🟡 Yellow | Approaching limit, monitor |
| **High Risk** | 140° - 160° | 🟠 Orange | Elevated rotator cuff stress |
| **Critical** | 160° - 180° | 🔴 Red | High injury risk, immediate attention |

### Special Case: Overhead Smash
- Exception range: 120° - 160° classified as **safe** during overhead strokes
- Rationale: Higher shoulder angles are biomechanically necessary for overhead smash

### Alert Threshold
- **Percentage**: >10% of frames showing high/critical risk triggers session-level alert
- **File**: `python/biomechanics/injury_risk.py:30`

### Recommendations Generated
```
Priority: High
Category: Injury Prevention
Title: Reduce Shoulder Strain
Actions:
- Practice shoulder rotation drills
- Reduce overhead smash frequency
- Strengthen rotator cuff muscles
- Consider professional coaching for form correction
```

---

## 2. Elbow Flexion (Tennis Elbow Risk) ✅

**File**: `python/biomechanics/angles.py:17-23`

### Stroke-Specific Optimal Ranges

| Stroke Type | Optimal Range | Notes |
|-------------|---------------|-------|
| **Serve** | 90° - 120° | Moderate flexion for power transfer |
| **Groundstroke** | 120° - 160° | Extended arm for reach |
| **Dink** | 90° - 110° | Compact arm position |
| **Volley** | 90° - 120° | Similar to serve |
| **Overhead** | 90° - 170° | Full extension allowed |

### Risk Detection Logic
- Outside optimal range → Increments `elbow_strain` counter
- Combined with poor kinetic chain → Significantly higher risk
- **Alert Threshold**: >15% of frames outside optimal range

### Associated Risk: Poor Kinetic Chain
When hip rotation <30° during power strokes, arm absorbs more force:
- Increments both `poor_kinetic_chain` AND `elbow_strain` counters
- **Alert Threshold**: >20% of frames with poor kinetic chain

---

## 3. Knee Flexion (Knee Strain/Patellar Risk) ✅

**File**: `python/biomechanics/angles.py:24-30`

### Threshold Levels

| Level | Angle | Color | Risk Description |
|-------|-------|-------|------------------|
| **Optimal Ready** | 20° - 30° | 🟢 Green | Athletic stance |
| **Safe Range** | 20° - 90° | 🟢 Green | Normal athletic movement |
| **High Stress** | >90° | 🔴 Red | Deep squat = patellar stress |
| **Too Straight** | <20° | 🟡 Yellow | Poor athletic stance |

### Stroke-Specific Positions

| Stroke | Recommended Range |
|--------|-------------------|
| Ready Position | 20° - 30° |
| Dinking | 30° - 45° |
| Serving | 15° - 25° |
| Overhead | 30° - 45° |

### Alert Threshold
- **Percentage**: >15% of frames with stress_level='high'
- **File**: `python/biomechanics/injury_risk.py:32`

### Recommendations Generated
```
Priority: Medium
Category: Form
Title: Protect Your Knees
Actions:
- Maintain athletic stance (knees bent 20-45°)
- Avoid excessive squatting during dinks
- Strengthen quadriceps and hamstrings
- Consider knee support if pain persists
```

---

## 4. Spinal Flexion (Lower Back Risk) ✅ IMPLEMENTED

**Status**: Implemented in both TypeScript and Python.

### Implementation
- **TypeScript**: `lib/analysis/angles.ts` (calculateSpinalFlexion)
- **Python**: `python/biomechanics/angles.py` (calculate_spinal_flexion)

### Thresholds (Validated)

| Level | Forward Lean | Color | Risk Description |
|-------|--------------|-------|------------------|
| **Safe** | 0° - 30° | 🟢 Green | Normal posture |
| **Caution** | 30° - 45° | 🟡 Yellow | Approaching risky range |
| **High Risk** | >45° | 🔴 Red | Lower back strain risk (Shear force) |

### Implementation Details
- Calculation: Vector angle from hip-midpoint to shoulder-midpoint relative to vertical Y-axis.
- Logic: `lib/analysis/risk.ts` flags high risk (>45°) and caution (>30°).

---

## 5. Hip Rotation (Kinetic Chain/Power Generation) ✅

**File**: `python/biomechanics/angles.py:31-38`

### Threshold Levels

| Level | Rotation | Assessment | Risk |
|-------|----------|------------|------|
| **Good** | ≥optimal for stroke | Proper kinetic chain | None |
| **Moderate** | ≥30° | Some hip engagement | Low |
| **Poor** | <30° | Arm-only swing | Medium (elbow/back strain) |

### Stroke-Specific Optimal Ranges

| Stroke Type | Optimal Rotation |
|-------------|------------------|
| **Serve** | 10° - 20° |
| **Groundstroke** | 45° - 90° |
| **Dink** | 0° - 15° |
| **Volley** | 10° - 30° |
| **Overhead** | 60° - 120° |

### Risk Implication
Poor hip rotation during power strokes leads to:
1. **Elbow strain** - arm absorbs energy that should come from hips
2. **Lower back strain** - compensatory movements
3. **Reduced power** - inefficient energy transfer

---

## Risk Level Aggregation

### Frame-Level Classification
```python
# From lib/analysis/filter.ts:216-225
if issues.some(i => i.severity === 'high'):
    category = 'injury_risk'      # Priority 1
elif issues.some(i => i.severity === 'medium'):
    category = 'form_improvement' # Priority 2
elif issues.some(i => i.severity === 'low'):
    category = 'technique_flaw'   # Priority 3
else:
    category = 'good_form'        # Priority 4
```

### Session-Level Overall Risk
```python
# From python/biomechanics/injury_risk.py:231-236
if len(alerts) >= 2:
    overall_risk = 'high'
elif len(alerts) == 1:
    overall_risk = 'medium'
else:
    overall_risk = 'low'
```

---

## Confidence Intervals (Violations Before Alerting)

The system uses **percentage-based thresholds** rather than raw counts to account for video length:

| Risk Type | Threshold | Rationale |
|-----------|-----------|-----------|
| Shoulder Overuse | >10% of frames | Conservative - shoulder injuries are serious |
| Poor Kinetic Chain | >20% of frames | Higher tolerance - technique improvement |
| Knee Stress | >15% of frames | Moderate - allows for brief deep positions |
| Elbow Strain | >15% of frames | Moderate - cumulative stress concern |

**File**: `python/biomechanics/injury_risk.py:29-37`

---

## TypeScript Stroke-Specific Thresholds

**File**: `lib/analysis/filter.ts:53-95`

These thresholds are used for UI filtering and frame selection:

### Serve
- Shoulder: 90° - 140°
- Elbow: 90° - 130°
- Knee: 120° - 160°
- Min Hip Rotation: 30°

### Groundstroke
- Shoulder: 60° - 120°
- Elbow: 120° - 160°
- Knee: 110° - 150°
- Min Hip Rotation: 45°

### Dink
- Shoulder: 30° - 80°
- Elbow: 90° - 120°
- Knee: 100° - 140°
- Min Hip Rotation: 10°

### Overhead
- Shoulder: 140° - 170°
- Elbow: 90° - 170°
- Knee: 130° - 170°
- Min Hip Rotation: 30°

### Volley
- Shoulder: 40° - 90°
- Elbow: 90° - 130°
- Knee: 120° - 160°
- Min Hip Rotation: 15°

---

## Expert Validation Status

### Current Status: ⚠️ Pending Validation

The current thresholds are based on:
1. General sports biomechanics literature
2. Tennis/racquet sports research (adapted for pickleball)
3. Conservative estimates favoring under-alerting

### Validation Requirements

| # | Validation Item | Expert Notes/Status | Date Verified |
|---|-----------------|---------------------|---------------|
| 1 | **Shoulder Abduction**<br>Validate excessive strain thresholds (140°+) against rotator cuff data. | | |
| 2 | **Elbow Hyperextension**<br>Confirm hyperextension limits (180°+) and correlation with tennis elbow. | | |
| 3 | **Knee Flexion**<br>Validate patellar stress threshold (>90°) for pickleball movements. | | |
| 4 | **Spinal Flexion**<br>Review new 45° forward lean threshold for lower back risk. | | |
| 5 | **Confidence Intervals**<br>Confirm if 0.1s duration (3 frames) is sufficient for injury risk. | | |
| 6 | **Expert Sign-off**<br>Overall approval of risk model. | | |

### Recommended Experts Needed

| Expert Type | Focus Area |
|-------------|------------|
| **Sports Medicine Physician** | Clinical injury data correlation |
| **Physical Therapist** | Rehabilitation & Prevention strategies |
| **Biomechanics PhD** | Quantitative analysis of upper extremity |

---

## Summary: Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| Shoulder abduction (rotator cuff risk) | ✅ Complete |
| Elbow hyperextension (tennis elbow risk) | ✅ Complete |
| Knee flexion extremes (knee strain risk) | ✅ Complete |
| Spinal flexion (lower back risk) | ✅ Complete |
| 3-level risk system (green/yellow/red) | ✅ Complete (4 levels) |
| Confidence intervals defined | ✅ Complete |
| Expert validation completed | ❌ Pending |

---

## Linear Ticket Comment Template

```
## Status Update: Biomechanical Thresholds

### Completed ✅
- Shoulder abduction thresholds: 4 levels (safe/caution/high/critical)
  - Safe: 0-120°, Caution: 120-140°, High: 140-160°, Critical: 160-180°
  - Special case for overhead smash implemented

- Elbow flexion thresholds: Stroke-specific optimal ranges
  - Serve: 90-120°, Groundstroke: 120-160°, Dink: 90-110°
  - Tennis elbow risk tracked via poor kinetic chain correlation

- Knee flexion thresholds:
  - Safe: 20-90°, High stress: >90°
  - Stroke-specific ready positions defined

- Risk level system: 4 tiers (green/yellow/orange/red)
- Confidence intervals: Percentage-based (10-20% thresholds)

### Gap ❌
- Spinal flexion (lower back risk): NOT IMPLEMENTED
  - Planned in Advanced Biomechanics ticket
  - Proposed: Flag forward lean >45° during dinks

### Pending
- Expert validation with sports medicine professional
- Threshold adjustments based on clinical feedback

### Documentation
See: `docs/BIOMECHANICAL_THRESHOLDS.md`
```
