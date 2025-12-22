"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, ChevronLeft, Layout, Award } from "lucide-react";
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

const strokeEmojis: Record<string, string> = {
    serve: '🎾',
    groundstroke: '💪',
    'groundstroke-forehand': '💪',
    'groundstroke-backhand': '💪',
    dink: '🤏',
    overhead: '⚡',
    volley: '🏓'
};

// Separate component that uses search params
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

    // Initial sidebar state
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

    const jumpToStroke = (stroke: Stroke) => {
        setCurrentTime(stroke.timestamp);
        setSelectedStroke(stroke.id);
    };

    // Find current frame data
    const currentFrame = useMemo(() => {
        if (!analysisData?.frames || analysisData.frames.length === 0) return null;

        // Find closest frame using timestampSec
        return analysisData.frames.reduce((prev: any, curr: any) => {
            return Math.abs(curr.timestampSec - currentTime) < Math.abs(prev.timestampSec - currentTime) ? curr : prev;
        });
    }, [currentTime, analysisData]);

    // Calculate aggregates for gauges
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
        <div className="min-h-screen bg-gray-50 pb-8">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0 z-10 sticky top-0">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium hidden sm:inline">Back</span>
                        </button>
                        <h1 className="text-sm md:text-base font-bold text-[#1A237E]">Analyzed Session</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="bg-gray-100 p-0.5 rounded-lg flex mr-2">
                            <button
                                onClick={() => setViewMode('analysis')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${viewMode === 'analysis' ? 'bg-white text-[#1A237E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Layout className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Analysis</span>
                            </button>
                            <button
                                onClick={() => setViewMode('compare')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${viewMode === 'compare' ? 'bg-white text-[#1A237E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <span className="w-3.5 h-3.5 border-l-2 border-current block transform rotate-90 scale-75" /> <span className="hidden sm:inline">Compare</span>
                            </button>
                        </div>

                        <button
                            onClick={() => router.push(`/strikesense/analysis?stroke=${strokeType}`)}
                            className="px-4 py-2 text-sm font-bold bg-[#FF6F00] hover:bg-[#E65100] text-white rounded-lg shadow-sm transition-all flex items-center gap-2"
                        >
                            <Award className="w-4 h-4" />
                            Full Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content - Centered Grid Layout */}
            <div className="max-w-7xl mx-auto md:px-4 py-6 md:py-8 animate-in fade-in duration-500">

                <div className="grid lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN: VIDEO PLAYER (8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-white p-0 md:p-1 rounded-none md:rounded-xl border-b md:border border-gray-200 overflow-hidden h-auto md:h-[500px] shadow-none md:shadow-lg">
                            <VideoPanel
                                videoFile={null} // Playing from URL
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

                        {/* Ball Stats Row (Optional, if data exists) */}
                        {analysisData?.ballStats && (
                            <div className="grid grid-cols-3 gap-4">
                                {/* Can add stats later if available in player view */}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: INSIGHTS & METRICS (4 cols) */}
                    <div className="lg:col-span-4 space-y-4 flex flex-col h-auto md:h-[500px]">

                        {/* Real-time Metrics */}
                        <BiomechanicalMetrics
                            currentFrameMetrics={currentFrame?.metrics}
                            aggregates={aggregates}
                        />

                        {/* REAL-TIME ENHANCED ANALYSIS */}
                        <div className="flex-none bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <span className="text-amber-500">⚡</span> ENHANCED ANALYSIS
                            </h3>

                            <div className="space-y-3">
                                {/* SAFE STATUS */}
                                <div className={`p-3 rounded-lg border flex flex-col gap-1 transition-all duration-300 ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'bg-green-50 border-green-200 opacity-100' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-800' : 'text-gray-500'}`}>
                                            Shoulder Risk: SAFE
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Award className={`h-4 w-4 ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-600' : 'text-gray-400'}`} />
                                        <span className={`text-sm ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-700' : 'text-gray-400'}`}>
                                            Safe form detected
                                        </span>
                                    </div>
                                </div>

                                {/* RISK ALERT */}
                                {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex flex-col gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">⚠️ RISK ALERT</span>
                                        </div>
                                        <p className="text-sm font-medium text-red-900">
                                            FAULT: {currentFrame.metrics.feedback?.[0] || 'Form deviation detected'}
                                        </p>
                                    </div>
                                )}

                                {/* Fallback */}
                                {!currentFrame && (
                                    <div className="text-center py-4 opacity-50 text-xs text-text-secondary">
                                        Play video to see analysis
                                    </div>
                                )}
                            </div>
                        </div>



                        {/* PRO TIPS */}
                        <div className="flex-1 bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="text-yellow-500">💡</span> PRO TIPS
                            </h2>
                            <div className="space-y-4 overflow-y-auto pr-1">
                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                    <h4 className="text-xs font-bold text-[#1A237E] mb-1">Consistency is Key</h4>
                                    <p className="text-xs text-gray-600 leading-relaxed">Focus on getting the ball over the net and in play rather than hitting winners every time. Errors lose more points than winners win.</p>
                                </div>
                                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100/50">
                                    <h4 className="text-xs font-bold text-purple-900 mb-1">Master the Dink</h4>
                                    <p className="text-xs text-gray-600 leading-relaxed">Keep your dinks low and unattackable. Patience at the kitchen line forces your opponent to make a mistake.</p>
                                </div>
                                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100/50">
                                    <h4 className="text-xs font-bold text-orange-900 mb-1">Move with Purpose</h4>
                                    <p className="text-xs text-gray-600 leading-relaxed">Split step before your opponent hits the ball. Efficient movement sets up better shots and reduces injury risk.</p>
                                </div>
                                <div className="p-3 bg-green-50/50 rounded-lg border border-green-100/50">
                                    <h4 className="text-xs font-bold text-green-900 mb-1">Stay Balanced</h4>
                                    <p className="text-xs text-gray-600 leading-relaxed">Keep your weight forward and knees bent. A stable base allows for more power and control on every stroke.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PlayerPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-400">Loading player...</div>
            </div>
        }>
            <PlayerContent />
        </Suspense>
    );
}
