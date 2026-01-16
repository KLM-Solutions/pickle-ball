/**
 * Camera Angle Validation System
 * 
 * Analyzes first 10 seconds of video to validate camera angle for analysis.
 * Uses pose-based heuristics to estimate if the camera angle is acceptable.
 * 
 * Thresholds per stroke type:
 * - serve/overhead: 70 (side view critical)
 * - groundstroke: 65 (more forgiving)
 * - dink: 75 (precise angle matters)
 * - footwork: 60 (full body visibility main concern)
 * - overall: 65 (general purpose)
 */

export type StrokeType = 'serve' | 'groundstroke' | 'dink' | 'overhead' | 'footwork' | 'overall';

export interface ValidationIssue {
    type: 'angle' | 'distance' | 'framing' | 'stability' | 'visibility';
    severity: 'high' | 'medium' | 'low';
    message: string;
    correction?: string;
}

export interface ValidationResult {
    score: number;           // 0-100
    passed: boolean;
    threshold: number;
    issues: ValidationIssue[];
    suggestion?: string;     // Primary corrective suggestion
    framesSampled: number;
    analysisTimeMs: number;
}

// Thresholds per stroke type
const STROKE_THRESHOLDS: Record<StrokeType, number> = {
    serve: 70,
    overhead: 70,
    groundstroke: 65,
    dink: 75,
    footwork: 60,
    overall: 65,
};

// Corrective feedback messages
const CORRECTIONS: Record<string, { message: string; correction: string }> = {
    too_frontal: {
        message: 'Camera is facing the player directly',
        correction: 'Move to the side of the player (90° angle) for a better view of the swing',
    },
    too_far: {
        message: 'Player appears too small in frame',
        correction: 'Move 3-4 steps closer or zoom in on the player',
    },
    too_close: {
        message: 'Player is cut off at the edges',
        correction: 'Step back 2-3 steps to capture the full body and swing',
    },
    off_center_left: {
        message: 'Player is positioned too far left',
        correction: 'Move 2 steps to your left to center the player',
    },
    off_center_right: {
        message: 'Player is positioned too far right',
        correction: 'Move 2 steps to your right to center the player',
    },
    too_low: {
        message: 'Camera angle is too low',
        correction: 'Raise the camera to chest height (about 4 feet)',
    },
    too_high: {
        message: 'Camera angle is too high',
        correction: 'Lower the camera to eye level',
    },
    unstable: {
        message: 'Video has noticeable camera shake',
        correction: 'Use a tripod or stable surface for recording',
    },
    no_person: {
        message: 'No player detected in frame',
        correction: 'Make sure the player is visible in the camera view',
    },
    dark: {
        message: 'Video appears too dark',
        correction: 'Record with better lighting or face the light source',
    },
};

/**
 * Extract frames from video at regular intervals
 */
async function extractFrames(
    videoElement: HTMLVideoElement,
    numFrames: number = 5,
    maxDuration: number = 10
): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return frames;

    const duration = Math.min(videoElement.duration, maxDuration);
    const interval = duration / numFrames;

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    for (let i = 0; i < numFrames; i++) {
        const time = i * interval + 0.5; // Start 0.5s in

        await new Promise<void>((resolve) => {
            videoElement.currentTime = time;
            videoElement.onseeked = () => resolve();
        });

        ctx.drawImage(videoElement, 0, 0);
        frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    return frames;
}

/**
 * Simple brightness analysis
 */
function analyzeBrightness(imageData: ImageData): number {
    const data = imageData.data;
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        // Luminosity formula
        totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    return totalBrightness / pixelCount / 255; // 0-1 normalized
}

/**
 * Analyze frame for person detection using simple edge/motion heuristics
 * In production, this would use TensorFlow.js + MoveNet
 */
function analyzeFrameForPerson(imageData: ImageData): {
    detected: boolean;
    centerX: number; // 0-1, where 0.5 is center
    centerY: number;
    relativeSize: number; // 0-1, relative to frame
} {
    const { width, height, data } = imageData;

    // Simple edge detection for person silhouette
    // Look for significant contrast changes (edge of person vs background)
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let edgePixelCount = 0;

    const threshold = 30; // Edge threshold

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const idxRight = (y * width + x + 1) * 4;
            const idxDown = ((y + 1) * width + x) * 4;

            // Calculate gradient
            const gx = Math.abs(data[idx] - data[idxRight]) +
                Math.abs(data[idx + 1] - data[idxRight + 1]) +
                Math.abs(data[idx + 2] - data[idxRight + 2]);
            const gy = Math.abs(data[idx] - data[idxDown]) +
                Math.abs(data[idx + 1] - data[idxDown + 1]) +
                Math.abs(data[idx + 2] - data[idxDown + 2]);

            if (gx + gy > threshold * 3) {
                edgePixelCount++;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }

    // If we found enough edges, assume person is detected
    const detected = edgePixelCount > (width * height * 0.01);

    if (!detected) {
        return { detected: false, centerX: 0.5, centerY: 0.5, relativeSize: 0 };
    }

    const centerX = (minX + maxX) / 2 / width;
    const centerY = (minY + maxY) / 2 / height;
    const relativeSize = ((maxX - minX) * (maxY - minY)) / (width * height);

    return { detected, centerX, centerY, relativeSize };
}

/**
 * Analyze camera stability across frames
 */
function analyzeStability(frames: ImageData[]): number {
    if (frames.length < 2) return 100;

    let totalDiff = 0;

    for (let i = 1; i < frames.length; i++) {
        const prev = frames[i - 1].data;
        const curr = frames[i].data;
        let frameDiff = 0;

        // Sample every 100th pixel for speed
        for (let j = 0; j < prev.length; j += 400) {
            frameDiff += Math.abs(prev[j] - curr[j]);
        }

        totalDiff += frameDiff / (prev.length / 400);
    }

    const avgDiff = totalDiff / (frames.length - 1);

    // Lower difference = more stable
    // Typical range: 5-50 for normal video
    const stability = Math.max(0, 100 - avgDiff * 2);
    return stability;
}

/**
 * Calculate angle score based on person position analysis
 */
function calculateAngleScore(
    personAnalysis: { centerX: number; centerY: number; relativeSize: number }[],
    strokeType: StrokeType
): { score: number; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];
    let score = 100;

    const validAnalyses = personAnalysis.filter(p => p.relativeSize > 0.01);

    if (validAnalyses.length === 0) {
        issues.push({
            type: 'visibility',
            severity: 'high',
            message: CORRECTIONS.no_person.message,
            correction: CORRECTIONS.no_person.correction,
        });
        return { score: 0, issues };
    }

    // Average position across frames
    const avgCenterX = validAnalyses.reduce((sum, p) => sum + p.centerX, 0) / validAnalyses.length;
    const avgCenterY = validAnalyses.reduce((sum, p) => sum + p.centerY, 0) / validAnalyses.length;
    const avgSize = validAnalyses.reduce((sum, p) => sum + p.relativeSize, 0) / validAnalyses.length;

    // Check horizontal centering
    if (avgCenterX < 0.3) {
        score -= 15;
        issues.push({
            type: 'framing',
            severity: 'medium',
            message: CORRECTIONS.off_center_left.message,
            correction: CORRECTIONS.off_center_left.correction,
        });
    } else if (avgCenterX > 0.7) {
        score -= 15;
        issues.push({
            type: 'framing',
            severity: 'medium',
            message: CORRECTIONS.off_center_right.message,
            correction: CORRECTIONS.off_center_right.correction,
        });
    }

    // Check vertical centering
    if (avgCenterY < 0.25) {
        score -= 10;
        issues.push({
            type: 'angle',
            severity: 'low',
            message: CORRECTIONS.too_high.message,
            correction: CORRECTIONS.too_high.correction,
        });
    } else if (avgCenterY > 0.75) {
        score -= 10;
        issues.push({
            type: 'angle',
            severity: 'low',
            message: CORRECTIONS.too_low.message,
            correction: CORRECTIONS.too_low.correction,
        });
    }

    // Check size (distance)
    const idealSize = strokeType === 'dink' ? 0.15 : 0.08;
    const minSize = idealSize * 0.3;
    const maxSize = idealSize * 3;

    if (avgSize < minSize) {
        score -= 20;
        issues.push({
            type: 'distance',
            severity: 'high',
            message: CORRECTIONS.too_far.message,
            correction: CORRECTIONS.too_far.correction,
        });
    } else if (avgSize > maxSize) {
        score -= 15;
        issues.push({
            type: 'distance',
            severity: 'medium',
            message: CORRECTIONS.too_close.message,
            correction: CORRECTIONS.too_close.correction,
        });
    }

    return { score: Math.max(0, score), issues };
}

/**
 * Main validation function
 * Analyzes a video file and returns validation result
 */
export async function validateCameraAngle(
    videoFile: File | string,
    strokeType: StrokeType = 'groundstroke'
): Promise<ValidationResult> {
    const startTime = performance.now();
    const issues: ValidationIssue[] = [];

    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        video.onloadedmetadata = async () => {
            try {
                // Extract frames from first 10 seconds
                const frames = await extractFrames(video, 5, 10);

                if (frames.length === 0) {
                    resolve({
                        score: 0,
                        passed: false,
                        threshold: STROKE_THRESHOLDS[strokeType],
                        issues: [{ type: 'visibility', severity: 'high', message: 'Could not extract frames from video' }],
                        suggestion: 'Please try uploading the video again',
                        framesSampled: 0,
                        analysisTimeMs: performance.now() - startTime,
                    });
                    return;
                }

                // Analyze brightness
                const avgBrightness = frames.reduce((sum, f) => sum + analyzeBrightness(f), 0) / frames.length;
                if (avgBrightness < 0.15) {
                    issues.push({
                        type: 'visibility',
                        severity: 'medium',
                        message: CORRECTIONS.dark.message,
                        correction: CORRECTIONS.dark.correction,
                    });
                }

                // Analyze stability
                const stability = analyzeStability(frames);
                if (stability < 50) {
                    issues.push({
                        type: 'stability',
                        severity: stability < 30 ? 'high' : 'medium',
                        message: CORRECTIONS.unstable.message,
                        correction: CORRECTIONS.unstable.correction,
                    });
                }

                // Analyze person position in each frame
                const personAnalysis = frames.map(f => analyzeFrameForPerson(f));
                const { score: angleScore, issues: angleIssues } = calculateAngleScore(personAnalysis, strokeType);

                issues.push(...angleIssues);

                // Calculate final score
                let finalScore = angleScore;
                if (avgBrightness < 0.15) finalScore -= 10;
                if (stability < 50) finalScore -= (50 - stability) / 5;
                finalScore = Math.max(0, Math.min(100, finalScore));

                const threshold = STROKE_THRESHOLDS[strokeType];
                const passed = finalScore >= threshold;

                // Get primary suggestion
                const highPriorityIssue = issues.find(i => i.severity === 'high') || issues[0];
                const suggestion = highPriorityIssue?.correction;

                resolve({
                    score: Math.round(finalScore),
                    passed,
                    threshold,
                    issues,
                    suggestion,
                    framesSampled: frames.length,
                    analysisTimeMs: Math.round(performance.now() - startTime),
                });

            } catch (error) {
                console.error('Validation error:', error);
                resolve({
                    score: 50,
                    passed: false,
                    threshold: STROKE_THRESHOLDS[strokeType],
                    issues: [{ type: 'visibility', severity: 'low', message: 'Could not analyze video' }],
                    suggestion: 'Video analysis failed. You can continue anyway.',
                    framesSampled: 0,
                    analysisTimeMs: performance.now() - startTime,
                });
            }
        };

        video.onerror = () => {
            resolve({
                score: 0,
                passed: false,
                threshold: STROKE_THRESHOLDS[strokeType],
                issues: [{ type: 'visibility', severity: 'high', message: 'Could not load video' }],
                suggestion: 'Please try a different video file',
                framesSampled: 0,
                analysisTimeMs: performance.now() - startTime,
            });
        };

        // Load video
        if (typeof videoFile === 'string') {
            video.src = videoFile;
        } else {
            video.src = URL.createObjectURL(videoFile);
        }

        video.load();
    });
}

/**
 * Get the threshold for a stroke type
 */
export function getThreshold(strokeType: StrokeType): number {
    return STROKE_THRESHOLDS[strokeType] || 65;
}
