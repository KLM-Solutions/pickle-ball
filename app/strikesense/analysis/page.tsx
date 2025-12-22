"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft, Download, AlertCircle, Activity, TrendingUp, Award,
    BarChart3, Zap, ChevronDown, ChevronUp, Target
} from "lucide-react";
import ResultsDashboard from "../../components/dashboard/ResultsDashboard";

export const dynamic = 'force-dynamic';

// Separate component that uses search params
function AnalysisContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('risk');

    useEffect(() => {
        const storedResult = sessionStorage.getItem('analysisResult');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                console.log('Loaded analysis data:', parsed);
                setAnalysisData(parsed);
            } catch (e) {
                console.error('Failed to parse analysis result:', e);
                // Redirect back to upload if data is corrupted
                router.push('/strikesense/upload');
            }
        } else {
            console.log('No analysis result found in sessionStorage');
            // Redirect back to upload if no data
            setTimeout(() => router.push('/strikesense/upload'), 1000);
        }
    }, [router]);

    if (!analysisData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-gray-400 mb-2">Loading analysis...</div>
                    <div className="text-sm text-gray-500 mt-2">
                        If this takes too long, <button
                            onClick={() => router.push('/strikesense/upload')}
                            className="text-primary underline"
                        >
                            start over
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const strokes = analysisData.strokes || [];
    const frames = analysisData.frames || [];
    const playerStats = analysisData.playerStats;

    // Calculate risk distribution
    const riskDistribution = {
        high: frames.filter((f: any) => f.metrics?.injury_risk === 'high').length,
        medium: frames.filter((f: any) => f.metrics?.injury_risk === 'medium').length,
        low: frames.filter((f: any) => f.metrics?.injury_risk === 'low').length
    };

    // Calculate biomechanics scores
    const calculateScore = (values: number[], min: number, max: number) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const normalized = ((avg - min) / (max - min)) * 100;
        return Math.max(0, Math.min(100, normalized));
    };

    const shoulderAngles = frames
        .map((f: any) => f.metrics?.right_shoulder_abduction)
        .filter((v: any) => v !== undefined);
    const shoulderScore = shoulderAngles.length > 0
        ? 100 - calculateScore(shoulderAngles, 90, 180)
        : 75;

    const hipRotations = frames
        .map((f: any) => f.metrics?.hip_rotation_deg)
        .filter((v: any) => v !== undefined);
    const hipScore = hipRotations.length > 0
        ? calculateScore(hipRotations, 0, 90)
        : 80;

    const kneeFlexions = frames
        .map((f: any) => f.metrics?.right_knee_flexion)
        .filter((v: any) => v !== undefined);
    const kneeScore = kneeFlexions.length > 0
        ? calculateScore(kneeFlexions, 20, 40)
        : 85;

    const overallScore = Math.round((shoulderScore + hipScore + kneeScore) / 3);
    const letterGrade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B+' : overallScore >= 70 ? 'B' : overallScore >= 60 ? 'C+' : 'C';

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push(`/strikesense/player?stroke=${strokeType}`)}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-2 transition font-medium group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Watch Session Video
                    </button>
                    <h1 className="text-3xl font-extrabold text-[#1A237E] tracking-tight">Match Performance Report</h1>
                    <button className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-gray-700 shadow-sm transition flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>

                {/* Session Info Card - REDESIGNED */}
                <div className="bg-gradient-to-br from-[#1A237E] to-[#283593] rounded-3xl p-8 text-white mb-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Award size={160} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wider uppercase mb-3 backdrop-blur-md">
                                    Analysis Session
                                </div>
                                <h2 className="text-4xl font-black mb-2 leading-tight">
                                    Performance Summary
                                </h2>
                                <p className="text-lg opacity-80 font-medium">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="text-7xl font-black text-[#00BFA5] drop-shadow-lg">{letterGrade}</div>
                                <div className="text-sm font-bold opacity-70 mt-1 uppercase tracking-widest">Grade</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { label: 'Total Strokes', value: strokes.length, icon: Target },
                                { label: 'Overall Score', value: `${overallScore}%`, icon: Zap },
                                { label: 'High Risk', value: riskDistribution.high, icon: AlertCircle, color: 'text-red-400' },
                                { label: 'Focus Areas', value: riskDistribution.high > 0 ? 'Shoulder' : 'None', icon: Activity },
                                { label: 'Duration', value: playerStats?.trackedDurationSec ? `${Math.round(playerStats.trackedDurationSec)}s` : 'N/A', icon: Activity }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-colors">
                                    <div className="flex items-center gap-2 mb-2 opacity-70">
                                        {React.createElement(stat.icon as any, { size: 14 })}
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                                    </div>
                                    <div className={`text-2xl font-black ${stat.color || 'text-white'}`}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Injury Risk Section - CRITICAL */}
                <div className="bg-white rounded-xl border-2 border-[#FF6F00] mb-6 shadow-lg">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'risk' ? null : 'risk')}
                        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-[#FF6F00]" />
                            <h3 className="text-xl font-bold text-[#1A237E]">Injury Risk Detection</h3>
                            {riskDistribution.high > 0 && (
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                                    {riskDistribution.high} High
                                </span>
                            )}
                        </div>
                        {expandedSection === 'risk' ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {expandedSection === 'risk' && (
                        <div className="px-6 pb-6">
                            {/* Risk Distribution */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-red-700">{riskDistribution.high}</div>
                                    <div className="text-sm text-red-600">High Risk</div>
                                </div>
                                <div className="bg-yellow-50 border-2 border-yellow-500 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-yellow-700">{riskDistribution.medium}</div>
                                    <div className="text-sm text-yellow-600">Medium Risk</div>
                                </div>
                                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-green-700">{riskDistribution.low}</div>
                                    <div className="text-sm text-green-600">Low Risk</div>
                                </div>
                            </div>

                            {/* Alert Banner */}
                            {riskDistribution.high > 0 && shoulderAngles.length > 0 && (
                                <div className="bg-[#FF6F00]/10 border-2 border-[#FF6F00] rounded-xl p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-6 h-6 text-[#FF6F00] flex-shrink-0 mt-1" />
                                        <div>
                                            <div className="font-bold text-lg mb-1 text-[#1A237E]">
                                                Potential form improvement opportunity detected
                                            </div>
                                            <p className="text-sm text-gray-700 mb-3">
                                                Our analysis detected key biomechanical markers that could be optimized to reduce injury risk and improve consistency.
                                            </p>
                                            <button className="text-[#FF6F00] font-medium flex items-center gap-2 hover:gap-3 transition-all">
                                                Show Me How to Fix This →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* High Risk Frames */}
                            {riskDistribution.high === 0 && (
                                <div className="text-center py-8 text-gray-600">
                                    <div className="text-4xl mb-2">✓</div>
                                    <div className="font-medium">No high-risk movements detected!</div>
                                    <div className="text-sm">Your form is looking good.</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ENHANCED: Injury Risk Summary from Backend */}
                {analysisData.injury_risk_summary && (
                    <div className="bg-white rounded-xl border-2 border-purple-200 mb-6 shadow-lg">
                        <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
                            <div className="flex items-center gap-3 mb-4">
                                <Zap className="w-6 h-6 text-purple-600" />
                                <h3 className="text-xl font-bold text-[#1A237E]">⚡ Enhanced Injury Risk Analysis</h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${analysisData.injury_risk_summary.overall_risk === 'low' ? 'bg-green-100 text-green-700' :
                                    analysisData.injury_risk_summary.overall_risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {analysisData.injury_risk_summary.overall_risk.toUpperCase()} RISK
                                </span>
                            </div>

                            {/* Risk Percentages */}
                            {analysisData.injury_risk_summary.percentages && (
                                <div className="grid grid-cols-4 gap-3 mb-4">
                                    <div className="bg-white rounded-lg p-3 border border-red-200">
                                        <div className="text-2xl font-bold text-red-600">
                                            {analysisData.injury_risk_summary.percentages.shoulder_overuse}%
                                        </div>
                                        <div className="text-xs text-gray-600">Shoulder Risk</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-orange-200">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {analysisData.injury_risk_summary.percentages.poor_kinetic_chain}%
                                        </div>
                                        <div className="text-xs text-gray-600">Poor Kinetic Chain</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {analysisData.injury_risk_summary.percentages.knee_stress}%
                                        </div>
                                        <div className="text-xs text-gray-600">Knee Stress</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {analysisData.injury_risk_summary.percentages.elbow_strain}%
                                        </div>
                                        <div className="text-xs text-gray-600">Elbow Strain</div>
                                    </div>
                                </div>
                            )}

                            {/* Alerts */}
                            {analysisData.injury_risk_summary.alerts && analysisData.injury_risk_summary.alerts.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {analysisData.injury_risk_summary.alerts.map((alert: any, idx: number) => (
                                        <div key={idx} className={`p-3 rounded-lg border-2 ${alert.severity === 'high' ? 'bg-red-50 border-red-300' :
                                            alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                                                'bg-blue-50 border-blue-300'
                                            }`}>
                                            <div className="flex items-start gap-2">
                                                <span className="text-lg">{alert.icon || '⚠️'}</span>
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-gray-900">{alert.message}</div>
                                                    <div className="text-xs text-gray-600 mt-0.5">
                                                        Detected in {alert.percentage}% of frames
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Recommendations */}
                            {analysisData.injury_risk_summary.recommendations && analysisData.injury_risk_summary.recommendations.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-sm font-bold text-gray-700 mb-2">📋 Evidence-Based Recommendations:</div>
                                    {analysisData.injury_risk_summary.recommendations.map((rec: any, idx: number) => (
                                        <div key={idx} className="bg-white rounded-lg p-4 border-2 border-gray-200">
                                            <div className="flex items-start gap-3 mb-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${rec.priority === 'high' ? 'bg-red-500 text-white' :
                                                    rec.priority === 'medium' ? 'bg-yellow-500 text-white' :
                                                        rec.priority === 'info' ? 'bg-green-500 text-white' :
                                                            'bg-gray-500 text-white'
                                                    }`}>
                                                    {rec.priority.toUpperCase()}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-900">{rec.title}</div>
                                                    <div className="text-sm text-gray-600 mt-1">{rec.description}</div>
                                                </div>
                                            </div>
                                            {rec.actions && rec.actions.length > 0 && (
                                                <ul className="ml-6 mt-2 space-y-1">
                                                    {rec.actions.map((action: string, aidx: number) => (
                                                        <li key={aidx} className="text-sm text-gray-700">
                                                            • {action}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Biomechanical Metrics */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="w-6 h-6 text-[#00C853]" />
                        <h3 className="text-xl font-bold text-[#1A237E]">Biomechanical Metrics</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: 'Shoulder Safety', score: Math.round(shoulderScore), color: shoulderScore > 70 ? 'bg-[#00C853]' : 'bg-[#FF6F00]' },
                            { label: 'Hip Rotation', score: Math.round(hipScore), color: 'bg-blue-500' },
                            { label: 'Knee Stability', score: Math.round(kneeScore), color: 'bg-[#00C853]' },
                            { label: 'Balance Score', score: overallScore, color: 'bg-purple-500' }
                        ].map((metric, i) => (
                            <div key={i}>
                                <div className="flex justify-between mb-2">
                                    <span className="font-medium text-gray-700">{metric.label}</span>
                                    <span className="font-bold text-[#1A237E]">{metric.score}</span>
                                </div>
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${metric.color} transition-all duration-500`}
                                        style={{ width: `${metric.score}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Player Stats */}
                {playerStats && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <TrendingUp className="w-6 h-6 text-blue-500" />
                            <h3 className="text-xl font-bold text-[#1A237E]">Movement Stats</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div className="text-center p-4 bg-gray-50 rounded-xl">
                                <div className="text-3xl font-bold text-[#1A237E]">
                                    {playerStats.totalDistanceMeters?.toFixed(1) || '0'}m
                                </div>
                                <div className="text-sm text-gray-600">Distance Covered</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-xl">
                                <div className="text-3xl font-bold text-[#1A237E]">
                                    {playerStats.avgSpeedKmh?.toFixed(1) || '0'} km/h
                                </div>
                                <div className="text-sm text-gray-600">Average Speed</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-xl">
                                <div className="text-3xl font-bold text-[#1A237E]">
                                    {playerStats.trackedDurationSec?.toFixed(1) || '0'}s
                                </div>
                                <div className="text-sm text-gray-600">Tracked Duration</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Recommendations */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Zap className="w-6 h-6" />
                        <h3 className="text-xl font-bold">AI Recommendations</h3>
                    </div>

                    <div className="space-y-3">
                        {[
                            {
                                priority: 'High',
                                text: shoulderScore < 70
                                    ? 'Focus on shoulder rotation drills to reduce injury risk'
                                    : 'Maintain your excellent shoulder form',
                                action: 'View Drills',
                                color: shoulderScore < 70 ? 'bg-red-500' : 'bg-green-500'
                            },
                            {
                                priority: 'Medium',
                                text: 'Practice split-step timing for better court coverage',
                                action: 'Watch Tips',
                                color: 'bg-yellow-500'
                            },
                            {
                                priority: 'Low',
                                text: `Your technique shows ${overallScore >= 80 ? 'excellent' : 'good'} fundamentals`,
                                action: 'See Analysis',
                                color: 'bg-green-500'
                            }
                        ].map((rec, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3">
                                <span className={`px-2 py-1 ${rec.color} rounded text-xs font-bold flex-shrink-0`}>
                                    {rec.priority}
                                </span>
                                <div className="flex-1">
                                    <p className="mb-2">{rec.text}</p>
                                    <button className="text-sm font-medium hover:underline">
                                        {rec.action} →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 flex gap-4">
                    <button
                        onClick={() => router.push(`/strikesense/player?stroke=${strokeType}`)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-medium transition"
                    >
                        Watch Video
                    </button>
                    <button className="flex-1 bg-gradient-to-r from-[#00BFA5] to-cyan-400 hover:from-[#00A890] hover:to-cyan-500 text-white py-3 rounded-xl font-medium transition shadow-lg">
                        Share Report
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-gray-400 mb-2">Loading...</div>
                </div>
            </div>
        }>
            <AnalysisContent />
        </Suspense>
    );
}
