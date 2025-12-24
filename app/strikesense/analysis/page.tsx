"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft, AlertCircle, Activity, TrendingUp, Award,
    Zap, ChevronDown, ChevronUp, Target, Code, Copy, Check,
    MessageSquare, Loader2, Clock, Home
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export const dynamic = 'force-dynamic';

function AnalysisContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('coach');
    const [showJson, setShowJson] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // LLM Response state
    const [llmResponse, setLlmResponse] = useState<string | null>(null);
    const [llmLoading, setLlmLoading] = useState(false);
    const [llmError, setLlmError] = useState<string | null>(null);

    const copyJson = () => {
        if (analysisData) {
            navigator.clipboard.writeText(JSON.stringify(analysisData, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Fetch LLM response
    const fetchLlmResponse = async (data: any) => {
        setLlmLoading(true);
        setLlmError(null);
        try {
            const response = await fetch('/api/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stroke_type: data.stroke_type || strokeType,
                    frames: data.frames,
                    summary: data.summary,
                    job_id: data.job_id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate coaching feedback');
            }

            const result = await response.json();
            setLlmResponse(result.response);
        } catch (err: any) {
            setLlmError(err.message);
        } finally {
            setLlmLoading(false);
        }
    };

    useEffect(() => {
        const storedResult = sessionStorage.getItem('analysisResult');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                setAnalysisData(parsed);
                // Fetch LLM response
                fetchLlmResponse(parsed);
            } catch (e) {
                router.push('/strikesense/upload');
            }
        } else {
            setTimeout(() => router.push('/strikesense/upload'), 1000);
        }
    }, [router, strokeType]);

    if (!analysisData) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-emerald-400 mb-2 animate-pulse">Loading analysis...</div>
                    <button
                        onClick={() => router.push('/strikesense/upload')}
                        className="text-sm text-slate-500 hover:text-white underline"
                    >
                        Start over
                    </button>
                </div>
            </div>
        );
    }

    const strokes = analysisData.strokes || [];
    const frames = analysisData.frames || [];
    const playerStats = analysisData.playerStats;

    const riskDistribution = {
        high: frames.filter((f: any) => f.metrics?.injury_risk === 'high').length,
        medium: frames.filter((f: any) => f.metrics?.injury_risk === 'medium').length,
        low: frames.filter((f: any) => f.metrics?.injury_risk === 'low').length
    };

    const calculateScore = (values: number[], min: number, max: number) => {
        if (values.length === 0) return 75;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const normalized = ((avg - min) / (max - min)) * 100;
        return Math.max(0, Math.min(100, normalized));
    };

    const shoulderAngles = frames
        .map((f: any) => f.metrics?.right_shoulder_abduction)
        .filter((v: any) => v !== undefined);
    const shoulderScore = shoulderAngles.length > 0 ? 100 - calculateScore(shoulderAngles, 90, 180) : 75;

    const hipRotations = frames
        .map((f: any) => f.metrics?.hip_rotation_deg)
        .filter((v: any) => v !== undefined);
    const hipScore = hipRotations.length > 0 ? calculateScore(hipRotations, 0, 90) : 80;

    const kneeFlexions = frames
        .map((f: any) => f.metrics?.right_knee_flexion)
        .filter((v: any) => v !== undefined);
    const kneeScore = kneeFlexions.length > 0 ? calculateScore(kneeFlexions, 20, 40) : 85;

    const overallScore = Math.round((shoulderScore + hipScore + kneeScore) / 3);
    const letterGrade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B+' : overallScore >= 70 ? 'B' : overallScore >= 60 ? 'C+' : 'C';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated background */}
            <div className="fixed inset-0 opacity-15 pointer-events-none">
                <div className="absolute top-10 left-5 md:top-20 md:left-10 w-48 md:w-72 h-48 md:h-72 bg-emerald-500 rounded-full filter blur-[100px] md:blur-[128px]" />
                <div className="absolute bottom-10 right-5 md:bottom-20 md:right-10 w-64 md:w-96 h-64 md:h-96 bg-violet-500 rounded-full filter blur-[100px] md:blur-[128px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 md:w-64 h-40 md:h-64 bg-orange-500 rounded-full filter blur-[100px] md:blur-[128px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 md:py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <button
                        onClick={() => router.push(`/strikesense/player?stroke=${strokeType}`)}
                        className="text-slate-400 hover:text-white flex items-center gap-1.5 md:gap-2 transition font-medium group p-1"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm">Video</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/strikesense/history')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-medium text-white transition text-sm"
                        >
                            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">History</span>
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-medium text-white transition text-sm"
                        >
                            <Home className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                    </div>
                </div>

                {/* Hero Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/10 mb-5 md:mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5">
                        <Award size={120} className="md:w-[200px] md:h-[200px]" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 md:mb-8 gap-4">
                            <div>
                                <div className="inline-flex items-center px-2.5 md:px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] md:text-xs font-bold tracking-wider uppercase mb-2 md:mb-3 border border-emerald-500/30">
                                    Analysis Complete
                                </div>
                                <h1 className="text-2xl md:text-4xl font-black text-white mb-1 md:mb-2">
                                    Performance Report
                                </h1>
                                <p className="text-xs md:text-base text-slate-400">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex flex-col items-center sm:items-end">
                                <div className="text-5xl md:text-7xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                    {letterGrade}
                                </div>
                                <div className="text-[10px] md:text-sm font-bold text-slate-500 mt-0.5 md:mt-1 uppercase tracking-widest">Grade</div>
                            </div>
                        </div>

                        {/* Stats Grid - Horizontal scroll on mobile */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
                            {[
                                { label: 'Strokes', value: strokes.length, icon: Target },
                                { label: 'Score', value: `${overallScore}%`, icon: Zap },
                                { label: 'High Risk', value: riskDistribution.high, icon: AlertCircle, color: riskDistribution.high > 0 ? 'text-red-400' : 'text-emerald-400' },
                                { label: 'Focus', value: riskDistribution.high > 0 ? 'Shoulder' : 'None', icon: Activity, hideOnMobile: true },
                                { label: 'Duration', value: playerStats?.trackedDurationSec ? `${Math.round(playerStats.trackedDurationSec)}s` : 'N/A', icon: Activity, hideOnMobile: true }
                            ].filter(stat => !stat.hideOnMobile || window.innerWidth >= 640).map((stat, i) => (
                                <div key={i} className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10 hover:bg-white/10 transition">
                                    <div className="flex items-center gap-1.5 mb-1.5 md:mb-2 text-slate-500">
                                        {React.createElement(stat.icon as any, { size: 12, className: "md:w-[14px] md:h-[14px]" })}
                                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider truncate">{stat.label}</span>
                                    </div>
                                    <div className={`text-lg md:text-2xl font-black ${stat.color || 'text-white'}`}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Coach Feedback - PRIMARY SECTION */}
                <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 rounded-xl md:rounded-2xl border border-violet-500/30 mb-4 md:mb-6 overflow-hidden backdrop-blur-sm">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'coach' ? null : 'coach')}
                        className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-white/5 transition"
                    >
                        <div className="flex items-center gap-2.5 md:gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-base md:text-xl font-bold text-white">AI Coach Feedback</h3>
                                <p className="text-[10px] md:text-sm text-slate-400 hidden sm:block">Personalized recommendations</p>
                            </div>
                            {llmLoading && (
                                <span className="flex items-center gap-1.5 px-2 md:px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-[10px] md:text-sm font-medium border border-violet-500/30">
                                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                    <span className="hidden sm:inline">Generating...</span>
                                </span>
                            )}
                        </div>
                        {expandedSection === 'coach' ? <ChevronUp className="text-slate-500 w-5 h-5" /> : <ChevronDown className="text-slate-500 w-5 h-5" />}
                    </button>

                    {expandedSection === 'coach' && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6">
                            {llmLoading && (
                                <div className="flex flex-col items-center justify-center py-8 md:py-12">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-violet-500/20 rounded-full flex items-center justify-center mb-3 md:mb-4">
                                        <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-violet-400 animate-spin" />
                                    </div>
                                    <p className="text-slate-400 text-sm">Generating feedback...</p>
                                </div>
                            )}

                            {llmError && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                                    <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-red-400 mx-auto mb-2" />
                                    <p className="text-red-400 font-medium text-sm">{llmError}</p>
                                    <button
                                        onClick={() => fetchLlmResponse(analysisData)}
                                        className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}

                            {llmResponse && !llmLoading && (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <div className="bg-slate-900/50 rounded-xl p-4 md:p-6 border border-white/5">
                                        <ReactMarkdown
                                            components={{
                                                h2: ({ children }) => (
                                                    <h2 className="text-lg md:text-xl font-bold text-white mt-4 md:mt-6 mb-3 md:mb-4 first:mt-0 flex items-center gap-2">
                                                        {children}
                                                    </h2>
                                                ),
                                                h3: ({ children }) => (
                                                    <h3 className="text-base md:text-lg font-bold text-emerald-400 mt-4 md:mt-5 mb-2 md:mb-3">{children}</h3>
                                                ),
                                                h4: ({ children }) => (
                                                    <h4 className="text-sm md:text-base font-bold text-slate-300 mt-3 md:mt-4 mb-2">{children}</h4>
                                                ),
                                                p: ({ children }) => (
                                                    <p className="text-slate-300 mb-2 md:mb-3 leading-relaxed text-sm">{children}</p>
                                                ),
                                                ul: ({ children }) => (
                                                    <ul className="list-disc list-inside text-slate-300 mb-3 md:mb-4 space-y-1 text-sm">{children}</ul>
                                                ),
                                                ol: ({ children }) => (
                                                    <ol className="list-decimal list-inside text-slate-300 mb-3 md:mb-4 space-y-1 text-sm">{children}</ol>
                                                ),
                                                li: ({ children }) => (
                                                    <li className="text-slate-300 text-sm">{children}</li>
                                                ),
                                                strong: ({ children }) => (
                                                    <strong className="text-white font-bold">{children}</strong>
                                                ),
                                                hr: () => <hr className="border-white/10 my-4 md:my-6" />,
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-4 border-violet-500 pl-3 md:pl-4 italic text-slate-400 my-3 md:my-4 text-sm">
                                                        {children}
                                                    </blockquote>
                                                ),
                                            }}
                                        >
                                            {llmResponse}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Injury Risk Section */}
                <div className="bg-white/5 rounded-xl md:rounded-2xl border border-orange-500/30 mb-4 md:mb-6 overflow-hidden backdrop-blur-sm">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'risk' ? null : 'risk')}
                        className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-white/5 transition"
                    >
                        <div className="flex items-center gap-2.5 md:gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm md:text-lg font-bold text-white">Injury Risk Detection</h3>
                                <p className="text-[10px] md:text-sm text-slate-500 hidden sm:block">Biomechanical risk analysis</p>
                            </div>
                            {riskDistribution.high > 0 && (
                                <span className="px-2 md:px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] md:text-sm font-bold border border-red-500/30">
                                    {riskDistribution.high} High
                                </span>
                            )}
                        </div>
                        {expandedSection === 'risk' ? <ChevronUp className="text-slate-500 w-5 h-5" /> : <ChevronDown className="text-slate-500 w-5 h-5" />}
                    </button>

                    {expandedSection === 'risk' && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6">
                            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 md:p-4 text-center">
                                    <div className="text-xl md:text-3xl font-bold text-red-400">{riskDistribution.high}</div>
                                    <div className="text-[10px] md:text-sm text-red-400/70">High</div>
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 md:p-4 text-center">
                                    <div className="text-xl md:text-3xl font-bold text-yellow-400">{riskDistribution.medium}</div>
                                    <div className="text-[10px] md:text-sm text-yellow-400/70">Medium</div>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 md:p-4 text-center">
                                    <div className="text-xl md:text-3xl font-bold text-emerald-400">{riskDistribution.low}</div>
                                    <div className="text-[10px] md:text-sm text-emerald-400/70">Low</div>
                                </div>
                            </div>

                            {riskDistribution.high === 0 ? (
                                <div className="text-center py-6 md:py-8">
                                    <div className="text-3xl md:text-4xl mb-2">✓</div>
                                    <div className="font-medium text-emerald-400 text-sm md:text-base">No high-risk movements detected!</div>
                                    <div className="text-xs md:text-sm text-slate-500">Your form is looking good.</div>
                                </div>
                            ) : (
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 md:p-4">
                                    <div className="flex items-start gap-2 md:gap-3">
                                        <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-bold text-sm md:text-lg mb-1 text-white">
                                                Form improvement opportunity
                                            </div>
                                            <p className="text-xs md:text-sm text-slate-400">
                                                See AI Coach Feedback above for recommendations.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Biomechanical Metrics */}
                <div className="bg-white/5 rounded-xl md:rounded-2xl border border-white/10 p-4 md:p-6 mb-4 md:mb-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 md:gap-3 mb-4 md:mb-6">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                        </div>
                        <h3 className="text-sm md:text-lg font-bold text-white">Biomechanical Metrics</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                        {[
                            { label: 'Shoulder Safety', score: Math.round(shoulderScore), color: shoulderScore > 70 ? 'from-emerald-500 to-teal-500' : 'from-orange-500 to-red-500' },
                            { label: 'Hip Rotation', score: Math.round(hipScore), color: 'from-blue-500 to-indigo-500' },
                            { label: 'Knee Stability', score: Math.round(kneeScore), color: 'from-emerald-500 to-teal-500' },
                            { label: 'Balance Score', score: overallScore, color: 'from-violet-500 to-purple-500' }
                        ].map((metric, i) => (
                            <div key={i}>
                                <div className="flex justify-between mb-1.5 md:mb-2">
                                    <span className="font-medium text-slate-400 text-xs md:text-sm">{metric.label}</span>
                                    <span className="font-bold text-white text-sm md:text-base">{metric.score}%</span>
                                </div>
                                <div className="h-2.5 md:h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${metric.color} transition-all duration-500`}
                                        style={{ width: `${metric.score}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Player Stats */}
                {playerStats && (
                    <div className="bg-white/5 rounded-xl md:rounded-2xl border border-white/10 p-4 md:p-6 mb-4 md:mb-6 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 md:gap-3 mb-4 md:mb-6">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                            </div>
                            <h3 className="text-sm md:text-lg font-bold text-white">Movement Stats</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                            <div className="text-center p-3 md:p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-xl md:text-3xl font-bold text-white">
                                    {playerStats.totalDistanceMeters?.toFixed(1) || '0'}m
                                </div>
                                <div className="text-[10px] md:text-sm text-slate-500">Distance</div>
                            </div>
                            <div className="text-center p-3 md:p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-xl md:text-3xl font-bold text-white">
                                    {playerStats.avgSpeedKmh?.toFixed(1) || '0'}
                                </div>
                                <div className="text-[10px] md:text-sm text-slate-500">km/h Avg</div>
                            </div>
                            <div className="text-center p-3 md:p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-xl md:text-3xl font-bold text-white">
                                    {playerStats.trackedDurationSec?.toFixed(1) || '0'}s
                                </div>
                                <div className="text-[10px] md:text-sm text-slate-500">Duration</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Raw JSON Data Section */}
                <div className="bg-white/5 rounded-xl md:rounded-2xl border border-cyan-500/30 mb-4 md:mb-6 overflow-hidden backdrop-blur-sm">
                    <button
                        onClick={() => setShowJson(!showJson)}
                        className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-white/5 transition"
                    >
                        <div className="flex items-center gap-2.5 md:gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                                <Code className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm md:text-lg font-bold text-white">Raw JSON Data</h3>
                                <p className="text-[10px] md:text-sm text-slate-500 hidden sm:block">Complete analysis output</p>
                            </div>
                            <span className="px-2 md:px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-[10px] md:text-xs font-bold border border-cyan-500/30">
                                {frames.length} frames
                            </span>
                        </div>
                        {showJson ? <ChevronUp className="text-slate-500 w-5 h-5" /> : <ChevronDown className="text-slate-500 w-5 h-5" />}
                    </button>

                    {showJson && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6">
                            {/* Copy Button */}
                            <div className="flex justify-end mb-2 md:mb-3">
                                <button
                                    onClick={copyJson}
                                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs md:text-sm font-medium transition border border-cyan-500/30"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* JSON Viewer */}
                            <div className="bg-slate-950 rounded-xl border border-white/10 overflow-hidden">
                                <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-white/5 border-b border-white/10">
                                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500" />
                                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500" />
                                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500" />
                                    <span className="ml-2 text-[10px] md:text-xs text-slate-500 font-mono">analysis.json</span>
                                </div>
                                <pre className="p-3 md:p-4 overflow-auto max-h-[300px] md:max-h-[600px] text-[10px] md:text-xs font-mono text-slate-300 leading-relaxed">
                                    <code>{JSON.stringify(analysisData, null, 2)}</code>
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4">
                    <button
                        onClick={() => router.push(`/strikesense/player?stroke=${strokeType}`)}
                        className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 md:py-4 rounded-xl font-bold transition text-sm md:text-base"
                    >
                        ← Watch Video
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white py-3.5 md:py-4 rounded-xl font-bold transition shadow-lg shadow-emerald-500/30 text-sm md:text-base"
                    >
                        New Analysis →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-emerald-400 font-bold animate-pulse">Loading...</div>
            </div>
        }>
            <AnalysisContent />
        </Suspense>
    );
}
