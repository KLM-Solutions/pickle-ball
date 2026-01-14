export type StrokeType =
    | "serve"
    | "groundstroke"
    | "dink"
    | "overhead"
    | "footwork"
    | "overall";

export type ApiFrame = {
    frameIdx: number;  // Canonical: matches Python output
    timestampSec: number;
    bbox: [number, number, number, number];
    confidence: number;
    ball?: {
        bbox: [number, number, number, number];
        confidence: number;
    } | null;
    metrics?: {
        right_elbow_flexion?: number;
        right_shoulder_abduction?: number;
        right_knee_flexion?: number;
        hip_rotation_deg?: number;
        wrist_to_body_distance_norm?: number;
        injury_risk?: "low" | "medium" | "high";
        feedback?: string[];
    };
};

export type StrokeEvent = {
    type: "serve" | "groundstroke" | "dink" | "overhead" | "volley";
    startFrame: number;
    endFrame: number;
    startSec: number;
    endSec: number;
    confidence: number;
    track_id?: number;           // Single-ID invariant: the player this stroke belongs to
    peak_velocity?: number;      // Peak wrist velocity during stroke
    peak_frame_idx?: number;     // Frame index where peak velocity occurred
    multi_id_warning?: boolean;  // True if this stroke had ID violations (debug)
};

export type AnalyzeResponse = {
    stroke_type: StrokeType;
    frames: ApiFrame[];
    strokes?: StrokeEvent[];
    videoUrl?: string | null;
    ballStats?: {
        avgSpeedKmh?: number;
        maxSpeedKmh?: number;
        totalDistanceMeters?: number;
    } | null;
    playerStats?: {
        totalDistanceMeters: number;
        avgSpeedKmh: number;
        trackedDurationSec: number;
    };
};
