/**
 * Pipeline Integrity Tests
 * 
 * Tests for:
 * 1. Single-ID invariant (each stroke has one track_id)
 * 2. frameIdx normalization
 * 3. Landmark shape validation
 */

import { analyzeFrame, analyzeFrames, RawFrame } from '@/lib/analysis';

// Mock landmark data (33 items as per MediaPipe)
const createMockLandmarks = () => {
    const names = [
        'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner',
        'right_eye', 'right_eye_outer', 'left_ear', 'right_ear', 'mouth_left',
        'mouth_right', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index',
        'right_index', 'left_thumb', 'right_thumb', 'left_hip', 'right_hip',
        'left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'left_heel',
        'right_heel', 'left_foot_index', 'right_foot_index'
    ];

    return names.map((name, i) => ({
        name,
        x: 0.5,
        y: 0.5 + i * 0.01,
        z: 0,
        visibility: 1,
    }));
};

const createMockFrame = (overrides: Partial<RawFrame> = {}): RawFrame => ({
    frameIdx: 0,
    timestampSec: 0,
    bbox: [100, 100, 200, 300],
    confidence: 0.95,
    track_id: 1,
    landmarks: createMockLandmarks(),
    ...overrides,
});

describe('Single-ID Invariant', () => {
    it('should preserve track_id through analysis', () => {
        const frame = createMockFrame({ track_id: 42 });
        const result = analyzeFrame(frame, 'serve');

        expect(result.track_id).toBe(42);
    });

    it('should maintain consistent track_id across frames', () => {
        const frames: RawFrame[] = [
            createMockFrame({ frameIdx: 0, track_id: 1 }),
            createMockFrame({ frameIdx: 1, track_id: 1 }),
            createMockFrame({ frameIdx: 2, track_id: 1 }),
        ];

        const result = analyzeFrames(frames, 'serve', 'test-job', '');

        result.frames.forEach(f => {
            expect(f.track_id).toBe(1);
        });
    });
});

describe('frameIdx Normalization', () => {
    it('should use frameIdx (not frameIndex) as canonical name', () => {
        const frame = createMockFrame({ frameIdx: 123 });
        const result = analyzeFrame(frame, 'serve');

        expect(result.frameIdx).toBe(123);
        expect((result as any).frameIndex).toBeUndefined();
    });

    it('should handle both frameIdx and timestampSec', () => {
        const frame = createMockFrame({
            frameIdx: 150,
            timestampSec: 5.0
        });
        const result = analyzeFrame(frame, 'serve');

        expect(result.frameIdx).toBe(150);
        expect(result.timestampSec).toBe(5.0);
    });
});

describe('Landmark Shape Validation', () => {
    it('should have exactly 33 landmarks', () => {
        const landmarks = createMockLandmarks();
        expect(landmarks).toHaveLength(33);
    });

    it('should calculate metrics from valid landmarks', () => {
        const frame = createMockFrame();
        const result = analyzeFrame(frame, 'serve');

        // With landmarks, we should get calculated metrics
        expect(result.metrics).toBeDefined();
        expect(result.metrics.right_elbow_flexion).not.toBeNull();
    });

    it('should handle null landmarks gracefully', () => {
        const frame = createMockFrame({ landmarks: null });
        const result = analyzeFrame(frame, 'serve');

        // Without landmarks, metrics should be null
        expect(result.metrics.right_elbow_flexion).toBeNull();
    });

    it('should return null metrics for empty landmarks array', () => {
        const frame = createMockFrame({ landmarks: [] as any });
        const result = analyzeFrame(frame, 'serve');

        expect(result.metrics.right_elbow_flexion).toBeNull();
    });

    it('should have correct landmark properties', () => {
        const landmarks = createMockLandmarks();

        landmarks.forEach((lm, idx) => {
            expect(typeof lm.x).toBe('number');
            expect(typeof lm.y).toBe('number');
            expect(typeof lm.z).toBe('number');
            expect(typeof lm.visibility).toBe('number');
            expect(lm.x).toBeGreaterThanOrEqual(0);
            expect(lm.x).toBeLessThanOrEqual(1);
        });
    });

    it('should have correct landmark order', () => {
        const landmarks = createMockLandmarks();

        expect(landmarks[0].name).toBe('nose');
        expect(landmarks[11].name).toBe('left_shoulder');
        expect(landmarks[12].name).toBe('right_shoulder');
        expect(landmarks[16].name).toBe('right_wrist');
    });
});

describe('Risk Detection', () => {
    it('should detect injury risk level', () => {
        const frame = createMockFrame();
        const result = analyzeFrame(frame, 'serve');

        expect(['low', 'medium', 'high']).toContain(result.injury_risk);
    });

    it('should include feedback for high-risk frames', () => {
        const frame = createMockFrame();
        const result = analyzeFrame(frame, 'serve');

        expect(result.feedback).toBeDefined();
        expect(Array.isArray(result.feedback)).toBe(true);
    });
});

describe('analyzeFrames Integration', () => {
    it('should process multiple frames correctly', () => {
        const frames: RawFrame[] = Array.from({ length: 5 }, (_, i) =>
            createMockFrame({
                frameIdx: i,
                timestampSec: i / 30,
                track_id: 1
            })
        );

        const result = analyzeFrames(frames, 'serve', 'test-job', 'http://test.com/video.mp4');

        expect(result.frames).toHaveLength(5);
        expect(result.job_id).toBe('test-job');
        expect(result.stroke_type).toBe('serve');
        expect(result.videoUrl).toBe('http://test.com/video.mp4');
    });

    it('should calculate summary statistics', () => {
        const frames: RawFrame[] = Array.from({ length: 30 }, (_, i) =>
            createMockFrame({
                frameIdx: i,
                timestampSec: i / 30
            })
        );

        const result = analyzeFrames(frames, 'serve', 'test-job', '');

        expect(result.summary).toBeDefined();
        expect(result.summary.total_frames).toBe(30);
        expect(result.summary.fps).toBeGreaterThan(0);
        expect(result.summary.duration_sec).toBeGreaterThan(0);
    });
});
