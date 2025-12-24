"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Layout, Award, ChevronRight } from "lucide-react";
import VideoPanel from "../../components/VideoPanel";
import { BiomechanicalMetrics } from "../../components/dashboard/BiomechanicalMetrics";

export const dynamic = 'force-dynamic';

interface Stroke {
    id: number;
    type: string;
    timestamp: number;
    label: string;
    confidence: number;
    riskLevel?: 'low' | 'medium' | 'high';
}

function PlayerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';

    const [currentTime, setCurrentTime] = useState(0);
    const [showSidebar, setShowSidebar] = useState(false);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [selectedStroke, setSelectedStroke] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'analysis' | 'compare'>('analysis');
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            setShowSidebar(true);
        }
    }, []);

    useEffect(() => {
        const storedResult = sessionStorage.getItem('analysisResult');
        if (storedResult) {
            const result = JSON.parse(storedResult);
            setAnalysisData(result);

            if (result.strokes) {
                const mappedStrokes = result.strokes.map((s: any, idx: number) => ({
                    id: idx,
                    type: s.type || s.stroke_type || 'groundstroke',
                    timestamp: s.startSec || s.timestamp || 0,
                    label: formatTime(s.startSec || s.timestamp || 0),
                    confidence: s.confidence || 0.9,
                    riskLevel: s.riskLevel || 'low'
                }));
                setStrokes(mappedStrokes);
            }
        }
    }, []);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const currentFrame = useMemo(() => {
        if (!analysisData?.frames || analysisData.frames.length === 0) return null;
        return analysisData.frames.reduce((prev: any, curr: any) => {
            return Math.abs(curr.timestampSec - currentTime) < Math.abs(prev.timestampSec - currentTime) ? curr : prev;
        });
    }, [currentTime, analysisData]);

    const aggregates = useMemo(() => {
        const frames = analysisData?.frames || [];
        if (frames.length === 0) return { hip: 0, shoulder: 0, knee: 0 };
        return {
            hip: Math.round(frames.reduce((acc: number, f: any) => acc + (f.metrics?.hip_rotation_deg || 0), 0) / frames.length),
            shoulder: Math.round(Math.max(...frames.map((f: any) => f.metrics?.right_shoulder_abduction || 0))),
            knee: Math.round(Math.min(...frames.map((f: any) => f.metrics?.right_knee_flexion || 180))),
        };
    }, [analysisData]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated background */}
            <div className="fixed inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full filter blur-[128px]" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500 rounded-full filter blur-[128px]" />
            </div>

            {/* Header */}
            <header className="relative z-20 h-16 bg-slate-900/80 border-b border-white/10 px-4 flex items-center justify-between backdrop-blur-sm sticky top-0">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium hidden sm:inline">Back</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎾</span>
                            <h1 className="text-sm md:text-base font-bold text-white">Analysis Session</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="bg-white/5 border border-white/10 p-1 rounded-lg flex">
                            <button
                                onClick={() => setViewMode('analysis')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                                    viewMode === 'analysis' 
                                        ? 'bg-white/10 text-white' 
                                        : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Layout className="w-3.5 h-3.5" /> 
                                <span className="hidden sm:inline">Analysis</span>
                            </button>
                            <button
                                onClick={() => setViewMode('compare')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                                    viewMode === 'compare' 
                                        ? 'bg-white/10 text-white' 
                                        : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <span className="w-3.5 h-3.5 border-l-2 border-current block transform rotate-90 scale-75" /> 
                                <span className="hidden sm:inline">Compare</span>
                            </button>
                        </div>

                        <button
                            onClick={() => router.push(`/strikesense/analysis?stroke=${strokeType}`)}
                            className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white rounded-lg shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2"
                        >
                            <Award className="w-4 h-4" />
                            <span className="hidden sm:inline">Full Report</span>
                            <ChevronRight className="w-4 h-4 sm:hidden" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">
                <div className="grid lg:grid-cols-12 gap-6">

                    {/* LEFT: Video Player */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-white/5 border border-white/10 p-1 rounded-2xl overflow-hidden backdrop-blur-sm h-auto lg:h-[500px]">
                            <VideoPanel
                                videoFile={null}
                                videoUrl={analysisData?.videoUrl || null}
                                onVideoUpload={() => { }}
                                analysisData={analysisData}
                                isProcessing={false}
                                currentTime={currentTime}
                                onTimeUpdate={setCurrentTime}
                                sideBySide={viewMode === 'compare'}
                                showOverlay={true}
                                playbackSpeed={playbackSpeed}
                                onSpeedChange={setPlaybackSpeed}
                            />
                        </div>
                    </div>

                    {/* RIGHT: Metrics & Insights */}
                    <div className="lg:col-span-4 space-y-4 flex flex-col h-auto lg:h-[500px]">

                        {/* Real-time Metrics */}
                        <BiomechanicalMetrics
                            currentFrameMetrics={currentFrame?.metrics}
                            aggregates={aggregates}
                        />

                        {/* Real-time Analysis */}
                        <div className="flex-none bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                            <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <span className="text-amber-400">⚡</span> Live Analysis
                            </h3>

                            <div className="space-y-3">
                                {/* Safe Status */}
                                <div className={`p-3 rounded-lg border transition-all duration-300 ${
                                    !currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' 
                                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                                        : 'bg-white/5 border-white/10 opacity-50'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${
                                            !currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' 
                                                ? 'text-emerald-400' 
                                                : 'text-slate-500'
                                        }`}>
                                            ✓ Form Status: SAFE
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Good biomechanics detected</p>
                                </div>

                                {/* Risk Alert */}
                                {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-pulse">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">⚠️ Risk Alert</span>
                                        </div>
                                        <p className="text-sm font-medium text-red-300">
                                            {currentFrame.metrics.feedback?.[0] || 'Form deviation detected'}
                                        </p>
                                    </div>
                                )}

                                {!currentFrame && (
                                    <div className="text-center py-4 text-xs text-slate-500">
                                        Play video to see live analysis
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pro Tips */}
                        <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm overflow-hidden flex flex-col">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="text-yellow-400">💡</span> Pro Tips
                            </h2>
                            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                                {[
                                    { title: "Consistency is Key", desc: "Focus on getting the ball over rather than hitting winners.", color: "from-blue-500/20 to-blue-600/10 border-blue-500/20" },
                                    { title: "Master the Dink", desc: "Keep dinks low and unattackable. Patience wins points.", color: "from-purple-500/20 to-purple-600/10 border-purple-500/20" },
                                    { title: "Move with Purpose", desc: "Split step before opponent hits. Better positioning.", color: "from-orange-500/20 to-orange-600/10 border-orange-500/20" },
                                    { title: "Stay Balanced", desc: "Weight forward, knees bent. Stable base equals power.", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20" },
                                ].map((tip, i) => (
                                    <div key={i} className={`p-3 bg-gradient-to-br ${tip.color} rounded-lg border`}>
                                        <h4 className="text-xs font-bold text-white mb-1">{tip.title}</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">{tip.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function PlayerPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-emerald-400 font-bold animate-pulse">Loading...</div>
            </div>
        }>
            <PlayerContent />
        </Suspense>
    );
}
