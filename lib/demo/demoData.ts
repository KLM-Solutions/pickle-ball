/**
 * Demo Mode Data for StrikeSense
 * 
 * Contains mock analysis results for demo session.
 * Uses video.MP4 from public/images folder.
 */

export const DEMO_VIDEO_URL = '/images/video.MP4';

export const DEMO_STROKE_TYPE = 'serve';

export const DEMO_CROP_COORDS = {
    x1: 0.25,
    y1: 0.15,
    x2: 0.75,
    y2: 0.95,
};

export const DEMO_VALIDATION_RESULT = {
    score: 87,
    passed: true,
    threshold: 70,
    issues: [],
    suggestion: null,
    analysis: 'Great camera setup! The player is well-centered with good visibility of the full swing motion.',
    framesSampled: 5,
    analysisTimeMs: 2400,
};

// Mock analysis results
export const DEMO_ANALYSIS_RESULT = {
    job_id: 'demo-session',
    stroke_type: 'serve',
    status: 'completed',

    // Summary metrics
    summary: {
        total_frames: 180,
        duration_sec: 6.0,
        fps: 30,
        overall_risk: 'low',
        dominant_stroke: 'serve',
    },

    // Mock frames with metrics (simplified - just key frames)
    frames: generateMockFrames(180),

    // LLM coaching response
    llm_response: `## Serve Analysis Summary

Your serve technique shows **solid fundamentals** with room for improvement in a few key areas.

### Strengths ✅
- **Good trophy position** - Your racquet preparation is well-timed
- **Balanced stance** - Weight transfer is smooth and controlled
- **Clean contact point** - Striking the ball at the optimal height

### Areas to Improve 🎯
1. **Hip rotation** could be more explosive for added power
2. **Follow-through** should extend more across the body
3. **Knee bend** at the loading phase could be deeper

### Practice Drill
**Power Loading Drill**: Practice your serve motion in slow motion, pausing at the trophy position. Focus on feeling the hip coil before exploding upward.

---
*Keep practicing! Your form is already in the top 30% of recreational players.*`,

    // Processing metadata
    processing_time_sec: 12.5,
    result_video_url: DEMO_VIDEO_URL, // Using same video as "annotated" for demo
};

// Generate mock frame data
function generateMockFrames(count: number) {
    const frames = [];

    for (let i = 0; i < count; i++) {
        const progress = i / count;

        // Simulate swing phases
        let phase = 'preparation';
        if (progress > 0.2 && progress < 0.5) phase = 'loading';
        if (progress >= 0.5 && progress < 0.7) phase = 'contact';
        if (progress >= 0.7) phase = 'follow_through';

        frames.push({
            frameIdx: i,
            frame_idx: i,
            timestampSec: i / 30,
            timestamp_sec: i / 30,
            bbox: [0.3, 0.1, 0.7, 0.95],
            confidence: 0.92 + Math.random() * 0.08,
            track_id: 1,

            metrics: {
                // Shoulder abduction (varies through swing)
                right_shoulder_abduction: 80 + Math.sin(progress * Math.PI * 2) * 40,

                // Hip rotation (builds then releases)
                hip_rotation_deg: progress < 0.5
                    ? 20 + progress * 60
                    : 50 - (progress - 0.5) * 80,

                // Knee flexion
                right_knee_flexion: 140 + Math.sin(progress * Math.PI) * 30,

                // Elbow flexion
                right_elbow_flexion: 90 + Math.cos(progress * Math.PI * 2) * 50,

                // Injury risk
                injury_risk: progress > 0.45 && progress < 0.55 ? 'medium' : 'low',

                // Feedback for key moments
                feedback: phase === 'contact'
                    ? ['Good contact height', 'Slight over-rotation detected']
                    : [],

                phase,
            },

            landmarks: null, // Simplified for demo
        });
    }

    return frames;
}

// Check if currently in demo mode
export function isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('demoMode') === 'true';
}

// Enable demo mode
export function enableDemoMode(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('demoMode', 'true');
    sessionStorage.setItem('videoUrl', DEMO_VIDEO_URL);
    sessionStorage.setItem('strokeType', DEMO_STROKE_TYPE);
    sessionStorage.setItem('cropCoords', JSON.stringify(DEMO_CROP_COORDS));
}

// Clear demo mode
export function clearDemoMode(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('demoMode');
}

// Get demo analysis result (ready to use)
export function getDemoAnalysisResult() {
    return DEMO_ANALYSIS_RESULT;
}
