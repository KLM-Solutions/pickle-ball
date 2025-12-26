import { useState, useMemo } from "react";
import { AnalyzeResponse, ApiFrame } from "../../types";
import VideoPanel from "../VideoPanel";
import { Activity, AlertTriangle, TrendingUp, User, Layout, List, CheckCircle, ArrowLeft, Zap, Code, Copy, Check, X } from "lucide-react";
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
    const [showJson, setShowJson] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyJson = () => {
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

    // Get stroke color
    const getStrokeColor = (type: string) => {
        switch (type) {
            case 'serve': return 'bg-black';
            case 'dink': return 'bg-neutral-700';
            case 'groundstroke': return 'bg-neutral-800';
            case 'overhead': return 'bg-neutral-600';
            default: return 'bg-neutral-500';
        }
    };

    return (
        <div className="min-h-screen bg-white text-neutral-900">
            {/* JSON Modal */}
            {showJson && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                    <Code className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-black">Analysis JSON Output</h3>
                                    <p className="text-xs text-neutral-500">
                                        {result.frames?.length || 0} frames • {(JSON.stringify(result).length / 1024).toFixed(1)}KB
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={copyJson}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-sm font-medium transition"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={() => setShowJson(false)}
                                    className="p-2 hover:bg-neutral-100 rounded-lg transition text-neutral-500 hover:text-black"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* JSON Content */}
                        <div className="flex-1 overflow-auto p-4 bg-neutral-50">
                            <pre className="text-xs font-mono text-neutral-700 leading-relaxed whitespace-pre-wrap">
                                <code>{JSON.stringify(result, null, 2)}</code>
                            </pre>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-neutral-500">
                                <span>Frames: <strong className="text-black">{result.frames?.length || 0}</strong></span>
                                <span>Strokes: <strong className="text-black">{result.strokes?.length || 0}</strong></span>
                                <span>Type: <strong className="text-black capitalize">{result.stroke_type || 'N/A'}</strong></span>
                            </div>
                            <button
                                onClick={() => setShowJson(false)}
                                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-black rounded-lg text-sm font-medium transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="relative z-10 border-b border-neutral-200 bg-white">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {/* Back Button */}
                            <button
                                onClick={onReset}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 border border-neutral-200 hover:bg-neutral-200 transition-all duration-300 group"
                            >
                                <ArrowLeft className="w-4 h-4 text-neutral-500 group-hover:text-black transition-colors" />
                                <span className="text-sm font-medium text-neutral-500 group-hover:text-black transition-colors">Back</span>
                            </button>
                            
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${getStrokeColor(result.stroke_type)} flex items-center justify-center shadow-lg`}>
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-black">Analysis Results</h1>
                                    <p className="text-xs text-neutral-500 capitalize">
                                        {result.stroke_type} • {result.frames.length} frames • {result.strokes?.length || 0} strokes
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowJson(!showJson)}
                                className={`px-3 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                                    showJson 
                                        ? 'bg-black text-white' 
                                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:text-black hover:bg-neutral-200'
                                }`}
                            >
                                <Code className="w-4 h-4" />
                                <span className="hidden sm:inline">JSON</span>
                            </button>
                            <div className="bg-neutral-100 p-1 rounded-lg border border-neutral-200 flex">
                                <button
                                    onClick={() => setViewMode('analysis')}
                                    className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition flex items-center gap-2 ${viewMode === 'analysis' ? 'bg-white text-black shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-black'}`}
                                >
                                    <Layout className="w-4 h-4" /> Analysis
                                </button>
                                <button
                                    onClick={() => setViewMode('compare')}
                                    className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition flex items-center gap-2 ${viewMode === 'compare' ? 'bg-white text-black shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-black'}`}
                                >
                                    <List className="w-4 h-4" /> Split View
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6">

                <div className="grid lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN: VIDEO PLAYER (8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-neutral-100 p-1 rounded-xl border border-neutral-200 overflow-hidden h-auto md:h-[500px] shadow-sm">
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
                        <div className="flex-none bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                            <h3 className="text-xs font-bold text-neutral-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                <TrendingUp className="h-3 w-3 text-black" /> Live Analysis
                            </h3>

                            <div className="space-y-3">
                                {/* SAFE STATUS */}
                                <div className={`p-3 rounded-lg border flex flex-col gap-1 transition-all duration-300 ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'bg-green-50 border-green-200' : 'bg-neutral-100 border-neutral-200 opacity-50'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-600' : 'text-neutral-400'}`}>
                                            Shoulder Risk: SAFE
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className={`h-4 w-4 ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-500' : 'text-neutral-400'}`} />
                                        <span className={`text-sm ${!currentFrame?.metrics?.injury_risk || currentFrame?.metrics?.injury_risk === 'low' ? 'text-green-600' : 'text-neutral-400'}`}>
                                            Safe form detected
                                        </span>
                                    </div>
                                </div>

                                {/* RISK ALERT (Persistent Box) */}
                                <div className={`p-3 border rounded-lg flex flex-col gap-2 transition-all duration-300 min-h-[72px] ${currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? (currentFrame.metrics.injury_risk === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200') : 'bg-neutral-100 border-neutral-200'}`}>
                                    <div className="flex items-center gap-2">
                                        {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? (
                                            <AlertTriangle className={`h-4 w-4 ${currentFrame.metrics.injury_risk === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                                        ) : (
                                            <Activity className="h-4 w-4 text-neutral-400" />
                                        )}
                                        <span className={`text-xs font-bold uppercase tracking-wider ${currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? (currentFrame.metrics.injury_risk === 'high' ? 'text-red-600' : 'text-amber-600') : 'text-neutral-400'}`}>
                                            {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? 'RISK ALERT' : 'LIVE STATUS'}
                                        </span>
                                    </div>
                                    <p className={`text-sm font-medium ${currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low' ? (currentFrame.metrics.injury_risk === 'high' ? 'text-red-600' : 'text-amber-600') : 'text-neutral-500'}`}>
                                        {currentFrame?.metrics?.injury_risk && currentFrame.metrics.injury_risk !== 'low'
                                            ? `FAULT: ${currentFrame.metrics.feedback?.[0] || 'Form deviation detected'}`
                                            : 'Monitoring player biomechanics...'}
                                    </p>
                                </div>

                                {/* Fallback for no video/frame loaded */}
                                {!currentFrame && (
                                    <div className="text-center py-4 opacity-50 text-xs text-neutral-500">
                                        Play video to see real-time analysis
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* STROKE LOG */}
                        <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                            <h3 className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider sticky top-0 bg-neutral-50 z-10 py-2 -mt-2 -mx-1 px-1">
                                Detected Strokes
                            </h3>
                            <div className="space-y-2 pb-2">
                                {result.strokes?.map((s, i) => (
                                    <button
                                        key={`stroke-log-${i}`}
                                        onClick={() => setCurrentTime(s.startSec)}
                                        className="w-full flex items-center justify-between p-3 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 text-left transition-all duration-200 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 bg-black`} />
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-neutral-400 block mb-0.5">{s.startSec.toFixed(1)}s</span>
                                                <span className="text-xs font-bold text-black capitalize block leading-none">{s.type}</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                                            {(s.confidence * 100).toFixed(0)}%
                                        </div>
                                    </button>
                                ))}
                                {(!result.strokes || result.strokes.length === 0) && (
                                    <div className="text-center py-8 opacity-50">
                                        <Activity className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                                        <p className="text-xs text-neutral-500">No strokes detected.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
