"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Award, ChevronRight, Home, BarChart3 } from "lucide-react";
import VideoPanel from "../../components/VideoPanel";
import { BiomechanicalMetrics } from "../../components/dashboard/BiomechanicalMetrics";

export const dynamic = 'force-dynamic';

function PlayerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';

    const [currentTime, setCurrentTime] = useState(0);
    const [showSidebar, setShowSidebar] = useState(false);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showMetrics, setShowMetrics] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setShowSidebar(true);
        }
    }, []);

    useEffect(() => {
        const storedResult = sessionStorage.getItem('analysisResult');
        if (storedResult) {
            const result = JSON.parse(storedResult);
            setAnalysisData(result);
        }
    }, []);

    const currentFrame = useMemo(() => {
        if (!analysisData?.frames || analysisData.frames.length === 0) return null;
        let bestIdx = 0;
        let bestDiff = Infinity;
        analysisData.frames.forEach((frame: any, idx: number) => {
            const timestamp = frame.timestampSec ?? frame.timestamp_sec ?? 0;
            const diff = Math.abs(timestamp - currentTime);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestIdx = idx;
            }
        });
        const frame = analysisData.frames[bestIdx];
        return {
            ...frame,
            _calculatedIdx: bestIdx,
            _calculatedTime: frame.timestampSec ?? frame.timestamp_sec ?? 0
        };
    }, [currentTime, analysisData]);

    const aggregates = useMemo(() => {
        const frames = analysisData?.frames || [];
        if (frames.length === 0) return { hip: 0, shoulder: 0, knee: 0 };
        
        const validHip = frames.filter((f: any) => f.metrics?.hip_rotation_deg != null);
        const validShoulder = frames.filter((f: any) => f.metrics?.right_shoulder_abduction != null);
        const validKnee = frames.filter((f: any) => f.metrics?.right_knee_flexion != null);
        
        return {
            hip: validHip.length > 0 ? Math.round(validHip.reduce((acc: number, f: any) => acc + f.metrics.hip_rotation_deg, 0) / validHip.length) : 0,
            shoulder: validShoulder.length > 0 ? Math.round(Math.max(...validShoulder.map((f: any) => f.metrics.right_shoulder_abduction))) : 0,
            knee: validKnee.length > 0 ? Math.round(Math.min(...validKnee.map((f: any) => f.metrics.right_knee_flexion))) : 0,
        };
    }, [analysisData]);

    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            <header className="relative z-20 h-14 bg-neutral-950 border-b border-neutral-800 px-4 flex items-center justify-between sticky top-0">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 text-neutral-500 hover:text-white transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium hidden sm:inline">Back</span>
                        </button>
                        <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎾</span>
                            <h1 className="text-sm font-semibold text-white capitalize">{strokeType} Analysis</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowMetrics(!showMetrics)}
                            className={`lg:hidden p-2 rounded-lg transition border ${
                                showMetrics 
                                    ? 'bg-white text-black border-white' 
                                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                        </button>
                        
                        <button
                            onClick={() => router.push(`/strikesense/analysis?stroke=${strokeType}`)}
                            className="px-3 py-2 text-sm font-semibold bg-white text-black rounded-lg transition hover:bg-neutral-200 flex items-center gap-1.5"
                        >
                            <Award className="w-4 h-4" />
                            <span className="hidden sm:inline">Full Report</span>
                            <ChevronRight className="w-4 h-4 sm:hidden" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
                <div className="grid lg:grid-cols-12 gap-4 md:gap-6">

                    {/* Video Player */}
                    <div className="lg:col-span-8">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                            <VideoPanel
                                videoFile={null}
                                videoUrl={analysisData?.videoUrl || null}
                                onVideoUpload={() => { }}
                                analysisData={analysisData}
                                isProcessing={false}
                                currentTime={currentTime}
                                onTimeUpdate={setCurrentTime}
                                sideBySide={false}
                                showOverlay={true}
                                playbackSpeed={playbackSpeed}
                                onSpeedChange={setPlaybackSpeed}
                            />
                        </div>
                    </div>

                    {/* Metrics Sidebar */}
                    <div className={`lg:col-span-4 space-y-4 ${showMetrics ? 'block' : 'hidden lg:block'}`}>

                        {/* Real-time Metrics */}
                        <BiomechanicalMetrics
                            currentFrameMetrics={currentFrame?.metrics}
                            aggregates={aggregates}
                        />

                        {/* Current Frame Info */}
                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                            <h3 className="text-xs font-semibold text-neutral-500 mb-3 uppercase tracking-wide">
                                Current Frame
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-black rounded-lg p-3 border border-neutral-800">
                                    <div className="text-[10px] text-neutral-600 uppercase mb-0.5">Frame</div>
                                    <div className="text-lg font-bold text-white">
                                        {currentFrame ? (currentFrame.frameIdx ?? currentFrame._calculatedIdx ?? 0) : '--'}
                                    </div>
                                </div>
                                <div className="bg-black rounded-lg p-3 border border-neutral-800">
                                    <div className="text-[10px] text-neutral-600 uppercase mb-0.5">Time</div>
                                    <div className="text-lg font-bold text-white">
                                        {currentFrame ? `${(currentFrame.timestampSec ?? currentFrame._calculatedTime ?? 0).toFixed(2)}s` : '--'}
                                    </div>
                                </div>
                            </div>

                            {/* Risk Status */}
                            {currentFrame && (
                                <div className="rounded-lg p-3 bg-black border border-neutral-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-neutral-500">Form Status</span>
                                        <span className="text-sm font-bold uppercase text-white">
                                            {currentFrame.injury_risk || 'analyzing'}
                                        </span>
                                    </div>
                                    {currentFrame.feedback && currentFrame.feedback.length > 0 && (
                                        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                                            {currentFrame.feedback[0]}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Session Summary */}
                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                            <h3 className="text-xs font-semibold text-neutral-500 mb-3 uppercase tracking-wide">
                                Session Summary
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black rounded-lg p-3 border border-neutral-800">
                                    <div className="text-[10px] text-neutral-600 uppercase mb-0.5">Frames</div>
                                    <div className="text-lg font-bold text-white">
                                        {analysisData?.summary?.total_frames || analysisData?.frames?.length || '--'}
                                    </div>
                                </div>
                                <div className="bg-black rounded-lg p-3 border border-neutral-800">
                                    <div className="text-[10px] text-neutral-600 uppercase mb-0.5">Duration</div>
                                    <div className="text-lg font-bold text-white">
                                        {analysisData?.summary?.duration_sec?.toFixed(1) || '--'}s
                                    </div>
                                </div>
                                <div className="bg-black rounded-lg p-3 border border-neutral-800">
                                    <div className="text-[10px] text-neutral-600 uppercase mb-0.5">FPS</div>
                                    <div className="text-lg font-bold text-white">
                                        {analysisData?.summary?.fps || '--'}
                                    </div>
                                </div>
                                <div className="bg-black rounded-lg p-3 border border-neutral-800">
                                    <div className="text-[10px] text-neutral-600 uppercase mb-0.5">Stroke</div>
                                    <div className="text-lg font-bold text-white capitalize">
                                        {strokeType}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile FAB */}
                <div className="fixed bottom-4 right-4 lg:hidden z-30">
                    <button
                        onClick={() => router.push(`/strikesense/analysis?stroke=${strokeType}`)}
                        className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <Award className="w-6 h-6 text-black" />
                    </button>
                </div>
            </main>
        </div>
    );
}

export default function PlayerPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white font-bold animate-pulse">Loading...</div>
            </div>
        }>
            <PlayerContent />
        </Suspense>
    );
}
