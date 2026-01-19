# Linear Tickets - Analytics Dashboard

## Ticket 1: Analysis Calculation Engine

---

### Title
**Biomechanical Analysis Calculation Engine**

### Description
Implement the core analysis calculation logic that processes raw pose estimation data from MediaPipe and generates meaningful biomechanical insights for pickleball stroke analysis.

### Acceptance Criteria
- [ ] Calculate joint angles from landmark coordinates (hip rotation, shoulder abduction, knee flexion, elbow flexion)
- [ ] Detect injury risks based on angle thresholds:
  - Shoulder overuse: abduction > 140°
  - Poor kinetic chain: hip rotation < 30°
  - Knee stress: flexion < 90° or > 170°
  - Elbow strain: excessive extension during contact
- [ ] Generate risk percentages per session (% of frames with each issue)
- [ ] Calculate overall risk level (low/medium/high) based on aggregated metrics
- [ ] Support stroke-specific thresholds (serve, dink, drive, overhead)
- [ ] Generate frame-by-frame feedback messages
- [ ] Calculate session summary statistics (total frames, FPS, duration)

### Technical Details
**Files involved:**
- `lib/analysis/metrics.ts` - Joint angle calculations
- `lib/analysis/risk.ts` - Risk detection with thresholds
- `lib/analysis/feedback.ts` - Feedback message generation
- `lib/analysis/index.ts` - Main orchestration
- `lib/analysis/types.ts` - TypeScript interfaces

**Key interfaces:**
```typescript
interface FrameMetrics {
  hip_rotation_deg: number;
  right_shoulder_abduction: number;
  right_knee_flexion: number;
  right_elbow_flexion: number;
  wrist_above_waist: boolean;
}

interface InjuryRisk {
  type: string;
  severity: 'low' | 'medium' | 'high';
  angle: number;
  message: string;
  recommendation: string;
}
```

### Labels
`backend`, `analysis`, `core-feature`

### Priority
**High**

### Story Points
8

---
---

## Ticket 2: Analytics Dashboard UI

---

### Title
**Build Analytics Dashboard for User Progress Tracking**

### Description
Create a comprehensive analytics dashboard that displays aggregated user statistics, technique metrics, risk analysis, and personalized drill recommendations based on their stroke analysis history.

### Acceptance Criteria
- [ ] Hero score card showing overall skill score (0-100) with trend indicator
- [ ] Weekly progress bar chart (last 7 days)
- [ ] Technique metrics cards with optimal ranges (Hip Rotation, Shoulder Abduction, Knee Flexion)
- [ ] Performance breakdown by stroke type
- [ ] Risk analysis section with colored progress bars
- [ ] Personalized drill recommendations based on top issues
- [ ] Recent sessions list with quick navigation to player view
- [ ] Responsive design for mobile and desktop
- [ ] Loading and empty states
- [ ] Authentication required (redirect if not signed in)

### Technical Details
**Files to create:**
- `app/strikesense/analytics/page.tsx` - Main dashboard page
- `app/api/analytics/summary/route.ts` - API endpoint for aggregated data

**API Response Structure:**
```typescript
interface AnalyticsSummary {
  totalSessions: number;
  skillScore: number;
  averageRisk: string;
  favoriteStroke: string;
  riskBreakdown: { shoulder_overuse, poor_kinetic_chain, knee_stress };
  trends: Array<{ date, score, sessions }>;
  strokeBreakdown: Array<{ stroke_type, sessions, avg_score, metrics }>;
  metricCards: Array<{ key, label, current, optimal_min, optimal_max, status }>;
  drills: Array<{ name, description, duration, priority }>;
  recentSessions: Array<{ id, stroke_type, created_at, score }>;
}
```

**Data Source:**
- Query `analysis_jobs` table filtered by `user_id` and `status = 'completed'`
- Extract metrics from `result_json` field

### Design Requirements
- Clean, modern UI with neutral color palette
- Black hero card with large skill score
- Color-coded risk indicators (green/yellow/red)
- Status icons for metric cards (✅ good, ➖ warning, ❌ critical)
- Smooth transitions and hover states

### Dependencies
- Ticket 1 (Analysis Calculation Engine) must be complete
- Supabase database with `analysis_jobs` table
- Clerk authentication integration

### Labels
`frontend`, `dashboard`, `feature`

### Priority
**High**

### Story Points
13

---
