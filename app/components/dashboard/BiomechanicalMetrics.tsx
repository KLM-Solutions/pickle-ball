"use client";

import { useMemo } from "react";
import { Gauge } from "./Gauge";

interface BiomechanicalMetricsProps {
    currentFrameMetrics?: {
        hip_rotation_deg?: number;
        right_shoulder_abduction?: number;
        right_knee_flexion?: number;
    };
    aggregates: {
        hip: number;
        shoulder: number;
        knee: number;
    };
}

export function BiomechanicalMetrics({ currentFrameMetrics, aggregates }: BiomechanicalMetricsProps) {

    // FIXED: Fallback to aggregates with better validation and debugging
    const hipValue = currentFrameMetrics?.hip_rotation_deg ?? aggregates.hip ?? 0;
    const shoulderValue = currentFrameMetrics?.right_shoulder_abduction ?? aggregates.shoulder ?? 0;
    const kneeValue = currentFrameMetrics?.right_knee_flexion ?? aggregates.knee ?? 90;

    // Debug logging to ensure data is flowing
    console.log("BiomechanicalMetrics Update:", {
        currentFrame: currentFrameMetrics,
        aggregates,
        computed: { hipValue, shoulderValue, kneeValue }
    });

    return (
        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <h3 className="text-sm font-bold text-black mb-4 flex items-center gap-2">
                📐 Biomechanical Analysis
            </h3>

            <div className="grid grid-cols-3 gap-2">
                <Gauge
                    label="Hip Rotation"
                    value={hipValue}
                    max={120}
                    ranges={[
                        { min: 0, max: 30, color: '#d4d4d4' },   // Low (neutral-300)
                        { min: 31, max: 70, color: '#000000' },  // Optimal (black)
                        { min: 71, max: 120, color: '#a3a3a3' }, // High (neutral-400)
                    ]}
                />

                <Gauge
                    label="Shldr Abd."
                    value={shoulderValue}
                    max={180}
                    ranges={[
                        { min: 0, max: 45, color: '#d4d4d4' },
                        { min: 46, max: 110, color: '#000000' },
                        { min: 111, max: 180, color: '#a3a3a3' },
                    ]}
                />

                <Gauge
                    label="Knee Flexion"
                    value={kneeValue}
                    max={150}
                    ranges={[
                        { min: 140, max: 180, color: '#d4d4d4' },
                        { min: 90, max: 139, color: '#000000' },
                        { min: 0, max: 89, color: '#a3a3a3' },
                    ]}
                />
            </div>

            <div className="mt-4 text-xs text-center text-neutral-500 bg-white p-2 rounded-lg border border-neutral-200">
                <p>Values update in real-time during playback</p>
            </div>
        </div>
    );
}
