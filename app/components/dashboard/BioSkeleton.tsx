"use client";

import React, { useEffect, useState, useRef } from 'react';

interface BioSkeletonProps {
    risks: {
        shoulder_overuse: number;
        poor_kinetic_chain: number;
        knee_stress: number;
    };
    className?: string; // e.g. "h-40 w-auto"
}

// 3D Point definition
type Point3D = { x: number; y: number; z: number };

// Skeleton structure (connections)
const BONES: [string, string][] = [
    // Torso
    ["head", "neck"],
    ["neck", "spine_mid"],
    ["spine_mid", "spine_base"],
    ["neck", "shoulder_center"], // Virtual center for shoulders
    ["shoulder_center", "left_shoulder"],
    ["shoulder_center", "right_shoulder"],
    ["spine_base", "hip_center"], // Virtual center for hips
    ["hip_center", "left_hip"],
    ["hip_center", "right_hip"],

    // Arms
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_hand"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_hand"],

    // Legs
    ["left_hip", "left_knee"],
    ["left_knee", "left_foot"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_foot"]
];

// Base Pose (T-Pose / Ready Pose)
const BASE_JOINTS: Record<string, Point3D> = {
    head: { x: 0, y: -50, z: 0 },
    neck: { x: 0, y: -40, z: 0 },
    spine_mid: { x: 0, y: -20, z: 5 }, // Slight curve
    spine_base: { x: 0, y: 0, z: 0 },

    shoulder_center: { x: 0, y: -38, z: 0 },
    left_shoulder: { x: -15, y: -38, z: 0 },
    right_shoulder: { x: 15, y: -38, z: 0 },

    left_elbow: { x: -25, y: -25, z: 10 }, // Arms forward slightly
    right_elbow: { x: 25, y: -25, z: 10 },
    left_hand: { x: -20, y: -10, z: 20 },
    right_hand: { x: 20, y: -10, z: 20 },

    hip_center: { x: 0, y: 0, z: 0 },
    left_hip: { x: -10, y: 5, z: 0 },
    right_hip: { x: 10, y: 5, z: 0 },

    left_knee: { x: -10, y: 30, z: 5 }, // Knees bent slightly
    right_knee: { x: 10, y: 30, z: 5 },
    left_foot: { x: -12, y: 55, z: 0 },
    right_foot: { x: 12, y: 55, z: 0 }
};

export default function BioSkeleton({ risks, className = "" }: BioSkeletonProps) {
    const [angle, setAngle] = useState(0);
    const requestRef = useRef<number>();

    // Animation Loop
    useEffect(() => {
        const animate = (time: number) => {
            // Slow rotation: 1 full rotation every ~6 seconds
            setAngle((time / 6000) * Math.PI * 2);
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current!);
    }, []);

    // 3D Projection Helper
    const project = (point: Point3D): { x: number; y: number; scale: number; opacity: number } => {
        // Rotate around Y axis
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x = point.x * cos - point.z * sin;
        const z = point.x * sin + point.z * cos;
        const y = point.y;

        // Perspective Project
        const FL = 300; // Focal length
        const scale = FL / (FL + z);

        return {
            x: x * scale + 50, // Center in 100x120 SVG
            y: y * scale + 60,
            scale,
            opacity: Math.max(0.3, (z + 50) / 100) // Simple depth cue
        };
    };

    // Color Logic
    const getColor = (risk: number) => {
        if (risk > 66) return "#ef4444"; // red
        if (risk > 33) return "#f59e0b"; // amber
        return "#10b981"; // emerald
    };

    const shoulderColor = getColor(risks.shoulder_overuse);
    const spineColor = getColor(risks.poor_kinetic_chain);
    const kneeColor = getColor(risks.knee_stress);
    const boneColor = "#d4d4d4";

    // Map joints to colors
    const getJointColor = (name: string) => {
        if (name.includes("shoulder")) return shoulderColor;
        if (name.includes("spine") || name.includes("hip")) return spineColor;
        if (name.includes("knee")) return kneeColor;
        return boneColor;
    };

    const projectedJoints = Object.fromEntries(
        Object.entries(BASE_JOINTS).map(([name, point]) => [name, project(point)])
    );

    return (
        <svg viewBox="0 0 100 120" className={className} style={{ overflow: 'visible' }}>
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Bones */}
            {BONES.map(([startName, endName], i) => {
                const start = projectedJoints[startName];
                const end = projectedJoints[endName];

                // Color gradient for bone? Just average for now or transparent
                const isRiskArea = getJointColor(startName) !== boneColor || getJointColor(endName) !== boneColor;
                const strokeColor = isRiskArea ? (getJointColor(startName)) : boneColor;

                return (
                    <line
                        key={`bone-${i}`}
                        x1={start.x} y1={start.y}
                        x2={end.x} y2={end.y}
                        stroke={strokeColor}
                        strokeWidth={3 * ((start.scale + end.scale) / 2)}
                        strokeOpacity={Math.min(start.opacity, end.opacity)}
                        strokeLinecap="round"
                    />
                );
            })}

            {/* Joints */}
            {Object.entries(projectedJoints).map(([name, p]) => (
                <circle
                    key={name}
                    cx={p.x}
                    cy={p.y}
                    r={3 * p.scale}
                    fill={getJointColor(name)}
                    fillOpacity={p.opacity}
                    filter={getJointColor(name) !== boneColor ? "url(#glow)" : undefined}
                />
            ))}
        </svg>
    );
}
