"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Award, ChevronRight, Code, Copy, Check, X, Home } from "lucide-react";
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

                        {/* Real-time Analysis */}
                        <div className="flex-none bg-white/5 border border-white/10 p-3 md:p-4 rounded-xl backdrop-blur-sm">
                            <h3 className="text-[10px] md:text-xs font-bold text-slate-400 mb-2 md:mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <span className="text-amber-400">⚡</span> Live Analysis
                            </h3>

                            <div className="space-y-2 md:space-y-3">
                                {/* Safe Status */}
                                <div className={`p-2.5 md:p-3 rounded-lg border transition-all duration-300 ${
                                    !currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' 
                                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                                        : 'bg-white/5 border-white/10 opacity-50'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs md:text-sm font-bold ${
                                            !currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' 
                                                ? 'text-emerald-400' 
                                                : 'text-slate-500'
                                        }`}>
                                            ✓ Form Status: SAFE
                                        </span>
                                    </div>
                                    <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 md:mt-1">Good biomechanics detected</p>
                                </div>

                                {/* Risk Alert */}
                                {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' && (
                                    <div className="p-2.5 md:p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-pulse">
                                        <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                                            <span className="text-[10px] md:text-xs font-bold text-red-400 uppercase tracking-wider">⚠️ Risk Alert</span>
                                        </div>
                                        <p className="text-xs md:text-sm font-medium text-red-300">
                                            {currentFrame.metrics.feedback?.[0] || 'Form deviation detected'}
                                        </p>
                                    </div>
                                )}

                                {!currentFrame && (
                                    <div className="text-center py-3 md:py-4 text-[10px] md:text-xs text-slate-500">
                                        Play video to see live analysis
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pro Tips */}
                        <div className="flex-1 bg-white/5 border border-white/10 p-3 md:p-4 rounded-xl backdrop-blur-sm overflow-hidden flex flex-col">
                            <h2 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 md:mb-3 flex items-center gap-2">
                                <span className="text-yellow-400">💡</span> Pro Tips
                            </h2>
                            <div className="space-y-2 md:space-y-3 overflow-y-auto pr-1 flex-1">
                                {[
                                    { title: "Consistency is Key", desc: "Focus on getting the ball over rather than hitting winners.", color: "from-blue-500/20 to-blue-600/10 border-blue-500/20" },
                                    { title: "Master the Dink", desc: "Keep dinks low and unattackable. Patience wins points.", color: "from-purple-500/20 to-purple-600/10 border-purple-500/20" },
                                    { title: "Move with Purpose", desc: "Split step before opponent hits. Better positioning.", color: "from-orange-500/20 to-orange-600/10 border-orange-500/20" },
                                    { title: "Stay Balanced", desc: "Weight forward, knees bent. Stable base equals power.", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20" },
                                ].map((tip, i) => (
                                    <div key={i} className={`p-2.5 md:p-3 bg-gradient-to-br ${tip.color} rounded-lg border`}>
                                        <h4 className="text-[10px] md:text-xs font-bold text-white mb-0.5 md:mb-1">{tip.title}</h4>
                                        <p className="text-[9px] md:text-xs text-slate-400 leading-relaxed">{tip.desc}</p>
                                    </div>
                                ))}
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
