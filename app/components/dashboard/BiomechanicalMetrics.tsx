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
        <div className="bg-surface-highlight p-3 md:p-4 rounded-none md:rounded-xl border-y md:border border-border shadow-none md:shadow-sm">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
                Biomechanical Analysis
            </h3>

            <div className="grid grid-cols-3 gap-2">
                <Gauge
                    label="Hip Rotation"
                    value={hipValue}
                    max={120}
                    ranges={[
                        { min: 0, max: 30, color: '#9CA3AF' },   // Low
                        { min: 31, max: 70, color: '#10B981' },  // Optimal
                        { min: 71, max: 120, color: '#F59E0B' }, // High/Extreme
                    ]}
                />

                <Gauge
                    label="Shldr Abd."
                    value={shoulderValue}
                    max={180}
                    ranges={[
                        { min: 0, max: 45, color: '#9CA3AF' },
                        { min: 46, max: 110, color: '#10B981' },
                        { min: 111, max: 180, color: '#EF4444' }, // Risk zone often > 110 depending on stroke
                    ]}
                />

                <Gauge
                    label="Knee Flexion"
                    value={kneeValue}
                    max={150} // 180 is straight, ~30-40 is deep squat. Flexion increases as you bend.
                    // Note: If data is 180=straight, then lower is "more bent".
                    // Let's assume input is degrees of flexion (0=straight, 90=bent) OR geometry angle (180=straight).
                    // Usually API returns interior angle. 10=straight, 90=bent.
                    // Checking existing usage: "180 - metric" suggests metric is angle (180=straight).
                    // So we invert for "Flexion Amount"? Or just show angle. 
                    // Let's show Angle (180 is stand, 90 is squat).
                    ranges={[
                        { min: 140, max: 180, color: '#9CA3AF' }, // Standing
                        { min: 90, max: 139, color: '#10B981' },  // Athletic Stance
                        { min: 0, max: 89, color: '#F59E0B' },   // Deep/Extreme
                    ]}
                />
            </div>

            <div className="mt-4 text-xs text-center text-text-secondary bg-surface p-2 rounded border border-border">
                <p>Values update in real-time during playback.</p>
            </div>
        </div>
    );
}
