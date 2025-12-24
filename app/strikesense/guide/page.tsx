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
        tips: ['Use tripod for stability', 'Capture full follow-through', 'Record 2-5 mins'],
        gradient: 'from-emerald-500 to-teal-600'
    },
    groundstroke: {
        angle: '45° Rear',
        distance: '10-15 ft',
        height: 'Waist',
        icon: '💪',
        title: 'DRIVE SETUP',
        subtitle: 'Shadow the shoulder rotation',
        image: '/images/groundstroke-camera-guide.png',
        tips: ['Show weight transfer', 'Show footwork clearly', 'Record 2-5 mins'],
        gradient: 'from-orange-500 to-red-500'
    },
    dink: {
        angle: 'Front/Side',
        distance: '8-10 ft',
        height: 'Net',
        icon: '🤏',
        title: 'DINK SETUP',
        subtitle: 'Focus on paddle precision',
        image: '/images/dink-camera-guide.png',
        tips: ['Capture mid-court view', 'Show wrist positioning', 'Record 2-5 mins'],
        gradient: 'from-violet-500 to-purple-600'
    },
    overhead: {
        angle: '90° Side',
        distance: '8-12 ft',
        height: 'Chest',
        icon: '⚡',
        title: 'OVERHEAD SETUP',
        subtitle: 'Track the ball contact point',
        image: '/images/overhead-camera-guide.png',
        tips: ['Capture full extension', 'Show shoulder rotation', 'Record 2-5 mins'],
        gradient: 'from-blue-500 to-indigo-600'
    }
};

function CameraGuideContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const guide = cameraGuides[strokeType] || cameraGuides.serve;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
            {/* Animated background */}
            <div className="fixed inset-0 opacity-20">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full filter blur-[128px] animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500 rounded-full filter blur-[128px] animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <header className="relative z-10 h-16 flex items-center justify-between px-4 border-b border-white/10 backdrop-blur-sm">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{guide.icon}</span>
                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">Setup Guide</span>
                </div>
                <div className="w-16" />
            </header>

            {/* Main Content */}
            <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
                
                {/* Hero Section */}
                <div className="text-center mb-8">
                    <div className={`inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br ${guide.gradient} items-center justify-center text-4xl mb-4 shadow-lg`}>
                        {guide.icon}
                    </div>
                    <h1 className="text-3xl font-bold mb-2">{guide.title}</h1>
                    <p className="text-slate-400">{guide.subtitle}</p>
                </div>

                {/* Visual Guide */}
                <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6 backdrop-blur-sm">
                    <div className="aspect-video relative">
                        <Image
                            src={guide.image}
                            alt="setup guide"
                            fill
                            className="object-contain p-4"
                            priority
                        />
                        {/* Fallback gradient if image missing */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${guide.gradient} opacity-10`} />
                    </div>
                </div>

                {/* Spec Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { icon: <Camera className="w-5 h-5" />, label: 'Angle', val: guide.angle },
                        { icon: <Ruler className="w-5 h-5" />, label: 'Distance', val: guide.distance },
                        { icon: <MoveVertical className="w-5 h-5" />, label: 'Height', val: guide.height }
                    ].map((spec, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                            <div className="text-emerald-400 flex justify-center mb-2">{spec.icon}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{spec.label}</div>
                            <div className="text-sm font-bold text-white">{spec.val}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Tips */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8 backdrop-blur-sm">
                    <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-4">Quick Tips</h3>
                    <div className="space-y-3">
                        {guide.tips.map((tip: string, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                <span className="text-sm text-slate-300">{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={() => router.push(`/strikesense/upload?stroke=${strokeType}`)}
                    className={`w-full bg-gradient-to-r ${guide.gradient} hover:opacity-90 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]`}
                >
                    I'm Ready — Upload Video →
                </button>
            </div>
        </div>
    );
}

export default function CameraGuidePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-emerald-400 font-bold animate-pulse">Loading...</div>
            </div>
        }>
            <CameraGuideContent />
        </Suspense>
    );
}
