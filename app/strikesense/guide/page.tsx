"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Ruler, MoveVertical, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export const dynamic = 'force-dynamic';

const cameraGuides: Record<string, any> = {
    serve: {
        angle: '90° Side',
        distance: '8-12 ft',
        height: 'Chest',
        icon: '🎾',
        title: 'SERVE SETUP',
        subtitle: 'Capture the full power arc',
        image: '/images/serve-camera-guide.png',
        tips: ['Use tripod for stability', 'Capture full follow-through', 'Record 2-5 mins']
    },
    groundstroke: {
        angle: '45° Rear',
        distance: '10-15 ft',
        height: 'Waist',
        icon: '💪',
        title: 'GROUNDSTROKE',
        subtitle: 'Shadow the shoulder rotation',
        image: '/images/groundstroke-camera-guide.png',
        tips: ['Show weight transfer', 'Show footwork clearly', 'Record 2-5 mins']
    },
    dink: {
        angle: 'Front/Side',
        distance: '8-10 ft',
        height: 'Net',
        icon: '🤏',
        title: 'DINK SETUP',
        subtitle: 'Focus on paddle precision',
        image: '/images/dink-camera-guide.png',
        tips: ['Capture mid-court view', 'Show wrist positioning', 'Record 2-5 mins']
    },
    overhead: {
        angle: '90° Side',
        distance: '8-12 ft',
        height: 'Chest',
        icon: '⚡',
        title: 'OVERHEAD',
        subtitle: 'Track the ball contact point',
        image: '/images/overhead-camera-guide.png',
        tips: ['Capture full extension', 'Show shoulder rotation', 'Record 2-5 mins']
    },
    footwork: {
        angle: 'Elevated Rear',
        distance: '15-20 ft',
        height: '5 ft Head',
        icon: '👟',
        title: 'FOOTWORK',
        subtitle: 'Map the court movement',
        image: '/images/footwork-camera-guide.png',
        tips: ['Elevated view best', 'Show split-steps', 'Record 2-5 mins']
    },
    overall: {
        angle: '90° Side',
        distance: '10-12 ft',
        height: 'Chest',
        icon: '📊',
        title: 'OVERALL FORM',
        subtitle: 'Standard biomechanics view',
        image: '/images/overall-camera-guide.png',
        tips: ['Capture full body', 'Show balance/posture', 'Record 2-5 mins']
    }
};

function CameraGuideContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const guide = cameraGuides[strokeType] || cameraGuides.serve;

    return (
        <div className="h-screen w-screen flex flex-col bg-white text-secondary overflow-hidden font-sans">
            {/* Header - Navy Consistent with Home Page */}
            <header className="h-14 bg-secondary text-white flex items-center justify-between px-4 flex-shrink-0 shadow-md">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 hover:opacity-80 transition touch-target"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-bold">BACK</span>
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xs font-black tracking-widest uppercase">SETUP GUIDE</h1>
                </div>
                <div className="w-10" /> {/* Balance */}
            </header>

            {/* Main Content Area - Scroll-free on Mobile */}
            <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden gap-3">

                {/* Hero Section - Light Mode */}
                <div className="text-center mb-1 flex-shrink-0">
                    <h2 className="text-xl font-bold text-secondary">{guide.title}</h2>
                    <p className="text-xs text-text-secondary">{guide.subtitle}</p>
                </div>

                {/* Visual Guide - Light Card */}
                <div className="flex-1 relative bg-surface border border-border rounded-3xl overflow-hidden flex flex-col shadow-sm">
                    <div className="flex-1 relative m-2">
                        <Image
                            src={guide.image}
                            alt="setup guide"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                {/* Spec Grid - Compact Cards */}
                <div className="grid grid-cols-3 gap-2 flex-shrink-0">
                    {[
                        { icon: <Camera className="w-4 h-4" />, label: 'Angle', val: guide.angle },
                        { icon: <Ruler className="w-4 h-4" />, label: 'Distance', val: guide.distance },
                        { icon: <MoveVertical className="w-4 h-4" />, label: 'Height', val: guide.height }
                    ].map((spec, i) => (
                        <div key={i} className="bg-surface border border-border rounded-xl p-2 text-center">
                            <div className="text-primary flex justify-center mb-1">{spec.icon}</div>
                            <div className="text-[8px] text-text-secondary font-bold uppercase tracking-wider mb-0.5">{spec.label}</div>
                            <div className="text-[10px] font-bold text-secondary truncate">{spec.val}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Tips - Light List */}
                <div className="bg-surface border border-border rounded-xl p-3 flex-shrink-0">
                    <h3 className="font-bold text-[10px] uppercase tracking-widest text-secondary mb-2">QUICK TIPS</h3>
                    <div className="space-y-1.5">
                        {guide.tips.map((tip: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                <span className="text-[11px] text-text-secondary font-medium uppercase tracking-tight">{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Action Area */}
            <div className="p-4 bg-white border-t border-border flex-shrink-0">
                <button
                    onClick={() => router.push(`/strikesense/upload?stroke=${strokeType}`)}
                    className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                    I'M READY →
                </button>
            </div>
        </div>
    );
}

export default function CameraGuidePage() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-white flex items-center justify-center">
                <div className="text-primary font-bold animate-pulse">LOADING...</div>
            </div>
        }>
            <CameraGuideContent />
        </Suspense>
    );
}
