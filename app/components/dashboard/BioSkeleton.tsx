"use client";

import React from 'react';

interface BioSkeletonProps {
    risks: {
        shoulder_overuse: number;
        poor_kinetic_chain: number;
        knee_stress: number;
    };
    className?: string;
}

export default function BioSkeleton({ risks, className = "h-40 w-auto" }: BioSkeletonProps) {
    const getColor = (risk: number) => {
        if (risk > 66) return "#ef4444"; // red-500
        if (risk > 33) return "#f59e0b"; // amber-500
        return "#10b981"; // emerald-500
    };

    const shoulderColor = getColor(risks.shoulder_overuse);
    const spineColor = getColor(risks.poor_kinetic_chain);
    const kneeColor = getColor(risks.knee_stress);

    // Default bone color
    const boneColor = "rgba(255, 255, 255, 0.4)";

    return (
        <svg viewBox="0 0 100 120" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Defs for Glow Effects */}
            <defs>
                <filter id="glow-shoulder" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* HEAD */}
            <circle cx="50" cy="15" r="8" stroke={boneColor} strokeWidth="3" />

            {/* SPINE */}
            <line x1="50" y1="23" x2="50" y2="55" stroke={spineColor} strokeWidth="4" />

            {/* SHOULDERS */}
            {/* Clavicle */}
            <line x1="30" y1="25" x2="70" y2="25" stroke={shoulderColor} strokeWidth="4" />

            {/* ARMS (Left) */}
            <line x1="30" y1="25" x2="20" y2="45" stroke={boneColor} strokeWidth="3" />
            <line x1="20" y1="45" x2="15" y2="65" stroke={boneColor} strokeWidth="3" />
            <circle cx="30" cy="25" r="3" fill={shoulderColor} /> {/* Shoulder Joint */}

            {/* ARMS (Right) */}
            <line x1="70" y1="25" x2="80" y2="45" stroke={boneColor} strokeWidth="3" />
            <line x1="80" y1="45" x2="85" y2="65" stroke={boneColor} strokeWidth="3" />
            <circle cx="70" cy="25" r="3" fill={shoulderColor} /> {/* Shoulder Joint */}

            {/* HIPS */}
            <line x1="40" y1="55" x2="60" y2="55" stroke={spineColor} strokeWidth="4" />
            <circle cx="50" cy="55" r="3" fill={spineColor} /> {/* Center Hip */}

            {/* LEGS (Left) */}
            <line x1="40" y1="55" x2="35" y2="80" stroke={boneColor} strokeWidth="3" />
            <line x1="35" y1="80" x2="35" y2="105" stroke={boneColor} strokeWidth="3" />
            <circle cx="35" cy="80" r="3" fill={kneeColor} /> {/* Knee Joint */}

            {/* LEGS (Right) */}
            <line x1="60" y1="55" x2="65" y2="80" stroke={boneColor} strokeWidth="3" />
            <line x1="65" y1="80" x2="65" y2="105" stroke={boneColor} strokeWidth="3" />
            <circle cx="65" cy="80" r="3" fill={kneeColor} /> {/* Knee Joint */}

        </svg>
    );
}
