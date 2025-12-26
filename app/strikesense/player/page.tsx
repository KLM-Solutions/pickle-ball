"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Award, ChevronRight, Code, Copy, Check, X, Home } from "lucide-react";
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
    const [showJson, setShowJson] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showMetrics, setShowMetrics] = useState(true); // Default to showing metrics on mobile

    const copyJson = () => {
        if (analysisData) {
            navigator.clipboard.writeText(JSON.stringify(analysisData, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

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

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

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
        // Add calculated index if not present
        return {
            ...frame,
            _calculatedIdx: bestIdx,
            _calculatedTime: frame.timestampSec ?? frame.timestamp_sec ?? 0
        };
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
                <div className="absolute top-10 left-5 md:top-20 md:left-10 w-48 md:w-72 h-48 md:h-72 bg-emerald-500 rounded-full filter blur-[100px] md:blur-[128px]" />
                <div className="absolute bottom-10 right-5 md:bottom-20 md:right-10 w-64 md:w-96 h-64 md:h-96 bg-violet-500 rounded-full filter blur-[100px] md:blur-[128px]" />
            </div>

            {/* JSON Modal */}
            {showJson && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-xl md:rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="w-7 h-7 md:w-8 md:h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                    <Code className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm md:text-base">Analysis JSON</h3>
                                    <p className="text-[10px] md:text-xs text-slate-500">
                                        {analysisData?.frames?.length || 0} frames
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={copyJson}
                                    className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs md:text-sm font-medium transition border border-cyan-500/30"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                    <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                                </button>
                                <button
                                    onClick={() => setShowJson(false)}
                                    className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </div>
                        </div>

                        {/* JSON Content */}
                        <div className="flex-1 overflow-auto p-3 md:p-4 bg-slate-950">
                            <pre className="text-[10px] md:text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                                <code>{JSON.stringify(analysisData, null, 2)}</code>
                            </pre>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 md:px-6 py-2.5 md:py-3 border-t border-white/10 bg-white/5">
                            <button
                                onClick={() => setShowJson(false)}
                                className="w-full md:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition border border-white/10"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="relative z-20 h-14 md:h-16 bg-slate-900/80 border-b border-white/10 px-3 md:px-4 flex items-center justify-between backdrop-blur-sm sticky top-0">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition p-1"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-xs md:text-sm font-medium hidden sm:inline">Back</span>
                        </button>
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="text-base md:text-lg">🎾</span>
                            <h1 className="text-xs md:text-base font-bold text-white">Analysis</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Mobile: Metrics Toggle */}
                        <button
                            onClick={() => setShowMetrics(!showMetrics)}
                            className="lg:hidden px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10"
                        >
                            📊
                        </button>
                        <button
                            onClick={() => setShowJson(!showJson)}
                            className={`px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                showJson 
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                    : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <Code className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">JSON</span>
                        </button>
                        <button
                            onClick={() => router.push(`/strikesense/analysis?stroke=${strokeType}`)}
                            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white rounded-lg shadow-lg shadow-orange-500/30 transition-all flex items-center gap-1.5"
                        >
                            <Award className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Report</span>
                            <ChevronRight className="w-3.5 h-3.5 sm:hidden" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
                <div className="grid lg:grid-cols-12 gap-4 md:gap-6">

                    {/* LEFT: Video Player */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-white/5 border border-white/10 p-1 rounded-xl md:rounded-2xl overflow-hidden backdrop-blur-sm h-auto lg:h-[500px]">
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

                    {/* RIGHT: Metrics & Insights - Hidden on mobile by default */}
                    <div className={`lg:col-span-4 space-y-3 md:space-y-4 flex flex-col h-auto lg:h-[500px] ${showMetrics ? 'block' : 'hidden lg:flex'}`}>

                        {/* Real-time Metrics */}
                        <BiomechanicalMetrics
                            currentFrameMetrics={currentFrame?.metrics}
                            aggregates={aggregates}
                        />

                        {/* Current Frame Data - Always visible */}
                        <div className="flex-none bg-white/5 border border-white/10 p-3 md:p-4 rounded-xl backdrop-blur-sm">
                            <h3 className="text-[10px] md:text-xs font-bold text-slate-400 mb-2 md:mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <span className="text-amber-400">⚡</span> Current Frame
                            </h3>

                            <div className="space-y-2 md:space-y-3">
                                {/* Frame Info */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                        <div className="text-[9px] md:text-[10px] text-slate-500 uppercase">Frame</div>
                                        <div className="text-sm md:text-base font-bold text-white">
                                            {currentFrame ? (currentFrame.frameIdx ?? currentFrame.frame_idx ?? currentFrame._calculatedIdx ?? 0) : '--'}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                        <div className="text-[9px] md:text-[10px] text-slate-500 uppercase">Time</div>
                                        <div className="text-sm md:text-base font-bold text-white">
                                            {currentFrame ? `${(currentFrame.timestampSec ?? currentFrame.timestamp_sec ?? currentFrame._calculatedTime ?? 0).toFixed(2)}s` : '--'}
                                        </div>
                                    </div>
                                </div>

                                {/* Stroke Type */}
                                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                    <div className="text-[9px] md:text-[10px] text-slate-500 uppercase">Stroke Type</div>
                                    <div className="text-sm md:text-base font-bold text-white capitalize">
                                        {currentFrame?.stroke_type || analysisData?.stroke_type || strokeType || '--'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Risk Status - Always visible */}
                        <div className="flex-none bg-white/5 border border-white/10 p-3 md:p-4 rounded-xl backdrop-blur-sm">
                            <h3 className="text-[10px] md:text-xs font-bold text-slate-400 mb-2 md:mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <span className="text-red-400">⚠️</span> Risk Status
                            </h3>

                            {currentFrame?.metrics?.injury_risk ? (
                                <div className={`p-2.5 md:p-3 rounded-lg border ${
                                    currentFrame.metrics.injury_risk === 'high' 
                                        ? 'bg-red-500/10 border-red-500/30' 
                                        : currentFrame.metrics.injury_risk === 'medium'
                                            ? 'bg-yellow-500/10 border-yellow-500/30'
                                            : 'bg-emerald-500/10 border-emerald-500/30'
                                }`}>
                                    <div className={`text-xs md:text-sm font-bold ${
                                        currentFrame.metrics.injury_risk === 'high' 
                                            ? 'text-red-400' 
                                            : currentFrame.metrics.injury_risk === 'medium'
                                                ? 'text-yellow-400'
                                                : 'text-emerald-400'
                                    }`}>
                                        {currentFrame.metrics.injury_risk.toUpperCase()}
                                    </div>
                                    {currentFrame.metrics.feedback && currentFrame.metrics.feedback.length > 0 && (
                                        <p className="text-[10px] md:text-xs text-slate-400 mt-1">
                                            {currentFrame.metrics.feedback[0]}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="p-2.5 md:p-3 rounded-lg border bg-slate-500/10 border-slate-500/30">
                                    <div className="text-xs md:text-sm font-bold text-slate-400">
                                        {currentFrame ? 'LOW' : 'Waiting...'}
                                    </div>
                                    <p className="text-[10px] md:text-xs text-slate-500 mt-1">
                                        {currentFrame ? 'No risk detected' : 'Play video to analyze'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Analysis Summary - Always visible */}
                        <div className="flex-none bg-white/5 border border-white/10 p-3 md:p-4 rounded-xl backdrop-blur-sm">
                            <h3 className="text-[10px] md:text-xs font-bold text-slate-400 mb-2 md:mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <span className="text-blue-400">📊</span> Summary
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                    <div className="text-[9px] md:text-[10px] text-slate-500 uppercase">Frames</div>
                                    <div className="text-sm md:text-base font-bold text-white">
                                        {analysisData?.summary?.total_frames || analysisData?.frames?.length || '--'}
                                    </div>
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                    <div className="text-[9px] md:text-[10px] text-slate-500 uppercase">Duration</div>
                                    <div className="text-sm md:text-base font-bold text-white">
                                        {analysisData?.summary?.duration_sec 
                                            ? `${analysisData.summary.duration_sec.toFixed(1)}s` 
                                            : analysisData?.playerStats?.trackedDurationSec 
                                                ? `${analysisData.playerStats.trackedDurationSec.toFixed(1)}s`
                                                : '--'}
                                    </div>
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                    <div className="text-[9px] md:text-[10px] text-slate-500 uppercase">FPS</div>
                                    <div className="text-sm md:text-base font-bold text-white">
                                        {analysisData?.summary?.fps || '--'}
                                    </div>
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                    <div className="text-[9px] md:text-[10px] text-slate-500 uppercase">Tracked</div>
                                    <div className="text-sm md:text-base font-bold text-white">
                                        {analysisData?.playerStats?.trackedDurationSec 
                                            ? `${analysisData.playerStats.trackedDurationSec.toFixed(1)}s` 
                                            : '--'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile: Floating Action Button for Report */}
                <div className="fixed bottom-4 right-4 lg:hidden z-30">
                    <button
                        onClick={() => router.push(`/strikesense/analysis?stroke=${strokeType}`)}
                        className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg shadow-orange-500/40 flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <Award className="w-6 h-6 text-white" />
                    </button>
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
