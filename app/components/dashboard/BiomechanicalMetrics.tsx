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
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                📐 Biomechanical Analysis
            </h3>

            <div className="grid grid-cols-3 gap-2">
                <Gauge
                    label="Hip Rotation"
                    value={hipValue}
                    max={120}
                    ranges={[
                        { min: 0, max: 30, color: '#525252' },   // Low (neutral-600)
                        { min: 31, max: 70, color: '#ffffff' },  // Optimal (white)
                        { min: 71, max: 120, color: '#a3a3a3' }, // High (neutral-400)
                    ]}
                />

                <Gauge
                    label="Shldr Abd."
                    value={shoulderValue}
                    max={180}
                    ranges={[
                        { min: 0, max: 45, color: '#525252' },
                        { min: 46, max: 110, color: '#ffffff' },
                        { min: 111, max: 180, color: '#737373' },
                    ]}
                />

                <Gauge
                    label="Knee Flexion"
                    value={kneeValue}
                    max={150}
                    ranges={[
                        { min: 140, max: 180, color: '#525252' },
                        { min: 90, max: 139, color: '#ffffff' },
                        { min: 0, max: 89, color: '#a3a3a3' },
                    ]}
                />
            </div>

            <div className="mt-4 text-xs text-center text-neutral-500 bg-black p-2 rounded-lg border border-neutral-800">
                <p>Values update in real-time during playback</p>
            </div>
        </div>
    );
}
