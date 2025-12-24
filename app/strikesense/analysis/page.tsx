"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft, Download, AlertCircle, Activity, TrendingUp, Award,
    Zap, ChevronDown, ChevronUp, Target, Share2, Code, Copy, Check
} from "lucide-react";

export const dynamic = 'force-dynamic';

function AnalysisContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('risk');
    const [showJson, setShowJson] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyJson = () => {
        if (analysisData) {
            navigator.clipboard.writeText(JSON.stringify(analysisData, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    useEffect(() => {
        const storedResult = sessionStorage.getItem('analysisResult');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                setAnalysisData(parsed);
            } catch (e) {
                router.push('/strikesense/upload');
            }
        } else {
            setTimeout(() => router.push('/strikesense/upload'), 1000);
        }
    }, [router]);

    if (!analysisData) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
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
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full filter blur-[128px]" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500 rounded-full filter blur-[128px]" />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500 rounded-full filter blur-[128px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push(`/strikesense/player?stroke=${strokeType}`)}
                        className="text-slate-400 hover:text-white flex items-center gap-2 transition font-medium group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Watch Video
                    </button>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-medium text-white transition flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 rounded-xl font-medium text-white transition flex items-center gap-2 shadow-lg shadow-emerald-500/30">
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Share</span>
                        </button>
                    </div>
                </div>

                {/* Hero Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-white/10 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Award size={200} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider uppercase mb-3 border border-emerald-500/30">
                                    Analysis Complete
                                </div>
                                <h1 className="text-4xl font-black text-white mb-2">
                                    Performance Report
                                </h1>
                                <p className="text-slate-400">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="text-7xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                    {letterGrade}
                                </div>
                                <div className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Grade</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { label: 'Total Strokes', value: strokes.length, icon: Target },
                                { label: 'Overall Score', value: `${overallScore}%`, icon: Zap },
                                { label: 'High Risk', value: riskDistribution.high, icon: AlertCircle, color: riskDistribution.high > 0 ? 'text-red-400' : 'text-emerald-400' },
                                { label: 'Focus Areas', value: riskDistribution.high > 0 ? 'Shoulder' : 'None', icon: Activity },
                                { label: 'Duration', value: playerStats?.trackedDurationSec ? `${Math.round(playerStats.trackedDurationSec)}s` : 'N/A', icon: Activity }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition">
                                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                                        {React.createElement(stat.icon as any, { size: 14 })}
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                                    </div>
                                    <div className={`text-2xl font-black ${stat.color || 'text-white'}`}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Injury Risk Section */}
                <div className="bg-white/5 rounded-2xl border border-orange-500/30 mb-6 overflow-hidden backdrop-blur-sm">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'risk' ? null : 'risk')}
                        className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-orange-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-white">Injury Risk Detection</h3>
                                <p className="text-sm text-slate-500">Biomechanical risk analysis</p>
                            </div>
                            {riskDistribution.high > 0 && (
                                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-bold border border-red-500/30">
                                    {riskDistribution.high} High
                                </span>
                            )}
                        </div>
                        {expandedSection === 'risk' ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                    </button>

                    {expandedSection === 'risk' && (
                        <div className="px-6 pb-6">
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-red-400">{riskDistribution.high}</div>
                                    <div className="text-sm text-red-400/70">High Risk</div>
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-yellow-400">{riskDistribution.medium}</div>
                                    <div className="text-sm text-yellow-400/70">Medium Risk</div>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-emerald-400">{riskDistribution.low}</div>
                                    <div className="text-sm text-emerald-400/70">Low Risk</div>
                                </div>
                            </div>

                            {riskDistribution.high === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-2">✓</div>
                                    <div className="font-medium text-emerald-400">No high-risk movements detected!</div>
                                    <div className="text-sm text-slate-500">Your form is looking good.</div>
                                </div>
                            ) : (
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <div className="font-bold text-lg mb-1 text-white">
                                                Form improvement opportunity detected
                                            </div>
                                            <p className="text-sm text-slate-400 mb-3">
                                                Our analysis detected biomechanical markers that could be optimized to reduce injury risk.
                                            </p>
                                            <button className="text-orange-400 font-medium flex items-center gap-2 hover:gap-3 transition-all">
                                                Show Me How to Fix This →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Biomechanical Metrics */}
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Activity className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Biomechanical Metrics</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: 'Shoulder Safety', score: Math.round(shoulderScore), color: shoulderScore > 70 ? 'from-emerald-500 to-teal-500' : 'from-orange-500 to-red-500' },
                            { label: 'Hip Rotation', score: Math.round(hipScore), color: 'from-blue-500 to-indigo-500' },
                            { label: 'Knee Stability', score: Math.round(kneeScore), color: 'from-emerald-500 to-teal-500' },
                            { label: 'Balance Score', score: overallScore, color: 'from-violet-500 to-purple-500' }
                        ].map((metric, i) => (
                            <div key={i}>
                                <div className="flex justify-between mb-2">
                                    <span className="font-medium text-slate-400">{metric.label}</span>
                                    <span className="font-bold text-white">{metric.score}%</span>
                                </div>
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
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
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-6 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Movement Stats</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-3xl font-bold text-white">
                                    {playerStats.totalDistanceMeters?.toFixed(1) || '0'}m
                                </div>
                                <div className="text-sm text-slate-500">Distance Covered</div>
                            </div>
                            <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-3xl font-bold text-white">
                                    {playerStats.avgSpeedKmh?.toFixed(1) || '0'} km/h
                                </div>
                                <div className="text-sm text-slate-500">Average Speed</div>
                            </div>
                            <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="text-3xl font-bold text-white">
                                    {playerStats.trackedDurationSec?.toFixed(1) || '0'}s
                                </div>
                                <div className="text-sm text-slate-500">Tracked Duration</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Recommendations */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Zap className="w-6 h-6 text-white" />
                        <h3 className="text-xl font-bold text-white">AI Recommendations</h3>
                    </div>

                    <div className="space-y-3">
                        {[
                            {
                                priority: shoulderScore < 70 ? 'High' : 'Info',
                                text: shoulderScore < 70 ? 'Focus on shoulder rotation drills to reduce injury risk' : 'Maintain your excellent shoulder form',
                                color: shoulderScore < 70 ? 'bg-red-500' : 'bg-emerald-500'
                            },
                            {
                                priority: 'Medium',
                                text: 'Practice split-step timing for better court coverage',
                                color: 'bg-yellow-500'
                            },
                            {
                                priority: 'Info',
                                text: `Your technique shows ${overallScore >= 80 ? 'excellent' : 'good'} fundamentals`,
                                color: 'bg-emerald-500'
                            }
                        ].map((rec, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3">
                                <span className={`px-2 py-1 ${rec.color} rounded text-xs font-bold flex-shrink-0`}>
                                    {rec.priority}
                                </span>
                                <p className="text-white">{rec.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Raw JSON Data Section */}
                <div className="bg-white/5 rounded-2xl border border-cyan-500/30 mt-6 overflow-hidden backdrop-blur-sm">
                    <button
                        onClick={() => setShowJson(!showJson)}
                        className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                                <Code className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-white">Raw JSON Data</h3>
                                <p className="text-sm text-slate-500">View complete analysis output</p>
                            </div>
                            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold border border-cyan-500/30">
                                {frames.length} frames
                            </span>
                        </div>
                        {showJson ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                    </button>

                    {showJson && (
                        <div className="px-6 pb-6">
                            {/* Copy Button */}
                            <div className="flex justify-end mb-3">
                                <button
                                    onClick={copyJson}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition border border-cyan-500/30"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy JSON
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* JSON Viewer */}
                            <div className="bg-slate-950 rounded-xl border border-white/10 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="ml-2 text-xs text-slate-500 font-mono">analysis_output.json</span>
                                </div>
                                <pre className="p-4 overflow-auto max-h-[600px] text-xs font-mono text-slate-300 leading-relaxed">
                                    <code>{JSON.stringify(analysisData, null, 2)}</code>
                                </pre>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-4 gap-3 mt-4">
                                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                                    <div className="text-lg font-bold text-cyan-400">{frames.length}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">Frames</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                                    <div className="text-lg font-bold text-cyan-400">{strokes.length}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">Strokes</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                                    <div className="text-lg font-bold text-cyan-400">
                                        {(JSON.stringify(analysisData).length / 1024).toFixed(1)}KB
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase">Size</div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                                    <div className="text-lg font-bold text-emerald-400">✓</div>
                                    <div className="text-[10px] text-slate-500 uppercase">Valid</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={() => router.push(`/strikesense/player?stroke=${strokeType}`)}
                        className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-xl font-bold transition"
                    >
                        ← Watch Video
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white py-4 rounded-xl font-bold transition shadow-lg shadow-emerald-500/30"
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
