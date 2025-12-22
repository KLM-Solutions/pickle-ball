"use client";

import { useMemo } from "react";

interface GaugeProps {
    value: number;
    min?: number;
    max?: number;
    label: string;
    unit?: string;
    ranges?: {
        min: number;
        max: number;
        color: string;
    }[];
}

export function Gauge({
    value,
    min = 0,
    max = 180,
    label,
    unit = "°",
    ranges = []
}: GaugeProps) {
    // Math helpers for SVG arc
    const strokeWidth = 10;
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const halfCircumference = circumference / 2;

    const percent = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const offset = halfCircumference - (percent * halfCircumference);

    // FIXED: Determine current color based on value and ranges with better validation
    const currentColor = useMemo(() => {
        // Ensure value is a number and handle edge cases
        const safeValue = isNaN(value) ? 0 : value;
        const match = ranges.find(r => safeValue >= r.min && safeValue <= r.max);
        return match ? match.color : "#00BFA5"; // Default to PRD primary color
    }, [value, ranges]);

    return (
        <div className="flex flex-col items-center w-full">
            <div className="relative w-full aspect-[1.6/1]">
                <svg
                    viewBox="0 0 100 60"
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMax meet"
                >
                    {/* Background Arc */}
                    <path
                        d="M 5 50 A 45 45 0 0 1 95 50"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Value Arc */}
                    <path
                        d="M 5 50 A 45 45 0 0 1 95 50"
                        fill="none"
                        className={`transition-all duration-300 ease-out`}
                        stroke={currentColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={halfCircumference}
                        strokeDashoffset={offset}
                    />

                    {/* Value Text - Scalable SVG Text */}
                    <text
                        x="50"
                        y="42"
                        textAnchor="middle"
                        fontSize="22"
                        fontWeight="bold"
                        fill="#1f2937"
                        className="font-bold"
                    >
                        {Math.round(value)}{unit}
                    </text>

                    {/* Label Text - Scalable SVG Text */}
                    <text
                        x="50"
                        y="58"
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="500"
                        fill="#6b7280"
                        className="uppercase"
                    >
                        {label}
                    </text>
                </svg>
            </div>
        </div>
    );
}
