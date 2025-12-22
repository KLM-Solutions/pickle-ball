import { useState, useMemo } from "react";
import { AnalyzeResponse, ApiFrame } from "../../types";
import VideoPanel from "../VideoPanel";
import { Activity, AlertTriangle, TrendingUp, User, Layout, List, CheckCircle } from "lucide-react";
import { StatCard } from "./StatCard";
import { BiomechanicalMetrics } from "./BiomechanicalMetrics";

interface ResultsDashboardProps {
    result: AnalyzeResponse;
    videoFile: File | null;
    onReset: () => void;
}

export default function ResultsDashboard({ result, videoFile, onReset }: ResultsDashboardProps) {
    const [currentTime, setCurrentTime] = useState(0);
    const [viewMode, setViewMode] = useState<'analysis' | 'compare'>('analysis');

    // Find current frame data based on currentTime
    const currentFrame = useMemo(() => {
        if (!result.frames || result.frames.length === 0) return null;
        // Find closest frame
        return result.frames.reduce((prev, curr) => {
            return Math.abs(curr.timestampSec - currentTime) < Math.abs(prev.timestampSec - currentTime) ? curr : prev;
        });
    }, [result.frames, currentTime]);

    // Calculate aggregates (memoized)
    const aggregates = useMemo(() => {
        const frames = result.frames || [];
        if (frames.length === 0) return { hip: 0, shoulder: 0, knee: 0 };
        return {
            hip: Math.round(frames.reduce((acc, f) => acc + (f.metrics?.hip_rotation_deg || 0), 0) / frames.length),
            shoulder: Math.round(Math.max(...frames.map(f => f.metrics?.right_shoulder_abduction || 0))),
            knee: Math.round(Math.min(...frames.map(f => f.metrics?.right_knee_flexion || 180))),
        };
    }, [result.frames]);

    return (
        <div className="max-w-7xl mx-auto md:px-4 py-0 md:py-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-4 px-4 md:px-0 pt-4 md:pt-0">
                <div>
                    <h2 className="text-2xl font-bold text-secondary">Analysis Results</h2>
                    <p className="text-sm text-text-secondary capitalize">
                        {result.stroke_type} • {result.frames.length} frames analyzed • {result.strokes?.length || 0} strokes identified
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-surface p-1 rounded-lg border border-border flex">
                        <button
                            onClick={() => setViewMode('analysis')}
                            className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition flex items-center gap-2 ${viewMode === 'analysis' ? 'bg-white text-secondary shadow-sm' : 'text-text-secondary hover:text-secondary'}`}
                        >
                            <Layout className="w-4 h-4" /> Analysis
                        </button>
                        <button
                            onClick={() => setViewMode('compare')}
                            className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition flex items-center gap-2 ${viewMode === 'compare' ? 'bg-white text-secondary shadow-sm' : 'text-text-secondary hover:text-secondary'}`}
                        >
                            <List className="w-4 h-4" /> Split View
                        </button>
                    </div>
                    <button
                        onClick={onReset}
                        className="text-sm font-medium text-primary hover:underline whitespace-nowrap px-2"
                    >
                        New Analysis
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN: VIDEO PLAYER (8 cols) */}
                <div className="lg:col-span-8 space-y-0 md:space-y-4">
                    <div className="bg-surface-highlight p-0 md:p-1 rounded-none md:rounded-xl border-b md:border border-border overflow-hidden h-auto md:h-[500px] shadow-none md:shadow-lg">
                        <VideoPanel
                            videoFile={videoFile}
                            videoUrl={result.videoUrl || null}
                            onVideoUpload={() => { }}
                            analysisData={result}
                            isProcessing={false}
                            showOverlay={true}
                            currentTime={currentTime}
                            onTimeUpdate={setCurrentTime}
                            sideBySide={viewMode === 'compare'}
                        />
                    </div>

                    {/* Ball Stats Row */}
                    {result.ballStats && (
                        <div className="grid grid-cols-3 gap-4">
                            <StatCard metric="Avg Speed" value={result.ballStats.avgSpeedKmh || 0} target={80} unit=" km/h" />
                            <StatCard metric="Max Speed" value={result.ballStats.maxSpeedKmh || 0} target={100} unit=" km/h" />
                            <StatCard metric="Distance" value={result.ballStats.totalDistanceMeters || 0} target={20} unit=" m" />
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
                    <div className="flex-none bg-surface p-3 rounded-xl border border-border">
                        <h3 className="text-xs font-bold text-text-secondary mb-3 flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-accent" /> ENHANCED ANALYSIS
                        </h3>

                        <div className="space-y-3">
                            {/* SAFE STATUS (Always visible or toggle based on risk?) - Showing 'Shoulder Risk: SAFE' as requested */}
                            <div className={`p-3 rounded-lg border flex flex-col gap-1 transition-all duration-300 ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'bg-green-50 border-green-200 opacity-100' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-800' : 'text-gray-500'}`}>
                                        Shoulder Risk: SAFE
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className={`h-4 w-4 ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-600' : 'text-gray-400'}`} />
                                    <span className={`text-sm ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-700' : 'text-gray-400'}`}>
                                        Safe form detected
                                    </span>
                                </div>
                            </div>

                            {/* RISK ALERT (Persistent Box) */}
                            <div className={`p-3 border rounded-lg flex flex-col gap-2 transition-all duration-300 ${currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? (
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                    ) : (
                                        <Activity className="h-4 w-4 text-gray-400" />
                                    )}
                                    <span className={`text-xs font-bold uppercase tracking-wider ${currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? 'text-red-700' : 'text-gray-500'}`}>
                                        {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? 'RISK ALERT' : 'LIVE STATUS'}
                                    </span>
                                </div>
                                <p className={`text-sm font-medium ${currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? 'text-red-900' : 'text-gray-500'}`}>
                                    {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low'
                                        ? `FAULT: ${currentFrame.metrics.feedback?.[0] || 'Form deviation detected'}`
                                        : 'Monitoring player biomechanics...'}
                                </p>
                            </div>

                            {/* Fallback for no video/frame loaded */}
                            {!currentFrame && (
                                <div className="text-center py-4 opacity-50 text-xs text-text-secondary">
                                    Play video to see real-time analysis
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STROKE LOG */}
                    <div className="flex-1 min-h-0 overflow-y-auto bg-surface p-0 md:p-3 rounded-none md:rounded-xl border-t md:border border-border mt-3">
                        <h3 className="text-xs font-bold text-text-secondary mb-2 px-3 md:px-0 sticky top-0 bg-surface z-10 py-2">DETECTED STROKES</h3>
                        <div className="space-y-2 px-3 md:px-0 pb-3">
                            {result.strokes?.map((s, i) => (
                                <button
                                    key={`stroke-log-${i}`}
                                    onClick={() => setCurrentTime(s.startSec)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-200 text-left transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.type === 'serve' ? 'bg-blue-500' : s.type === 'groundstroke' ? 'bg-green-500' : 'bg-purple-500'}`} />
                                        <div>
                                            <span className="text-[10px] font-mono font-bold text-gray-400 block mb-0.5">{s.startSec.toFixed(1)}s</span>
                                            <span className="text-xs font-bold text-gray-700 capitalize block leading-none">{s.type}</span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {(s.confidence * 100).toFixed(0)}%
                                    </div>
                                </button>
                            ))}
                            {(!result.strokes || result.strokes.length === 0) && (
                                <div className="text-center py-8 opacity-50">
                                    <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-xs">No strokes detected.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
