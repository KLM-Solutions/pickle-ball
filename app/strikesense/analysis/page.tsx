"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft, Activity, TrendingUp, Award,
    Zap, Target, MessageSquare, Loader2, Clock, Home,
    ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Shield
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export const dynamic = 'force-dynamic';

function AnalysisContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [expandedCoach, setExpandedCoach] = useState(true);
    
    const [llmResponse, setLlmResponse] = useState<string | null>(null);
    const [llmLoading, setLlmLoading] = useState(false);
    const [llmError, setLlmError] = useState<string | null>(null);

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
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-black mb-2 animate-pulse">Loading analysis...</div>
                    <button
                            onClick={() => router.push('/strikesense/upload')}
                        className="text-sm text-neutral-500 hover:text-black underline"
                        >
                        Start over
                        </button>
                </div>
            </div>
        );
    }

    const frames = analysisData.frames || [];
    const summary = analysisData.summary || {};

    const getAverage = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const getMax = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : null;
    const getMin = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : null;

    const shoulderAngles = frames.map((f: any) => f.metrics?.right_shoulder_abduction).filter((v: any) => v != null);
    const hipRotations = frames.map((f: any) => f.metrics?.hip_rotation_deg).filter((v: any) => v != null);
    const kneeFlexions = frames.map((f: any) => f.metrics?.right_knee_flexion).filter((v: any) => v != null);
    const elbowAngles = frames.map((f: any) => f.metrics?.right_elbow_flexion).filter((v: any) => v != null);

    const riskCounts = {
        high: frames.filter((f: any) => f.injury_risk === 'high').length,
        medium: frames.filter((f: any) => f.injury_risk === 'medium').length,
        low: frames.filter((f: any) => f.injury_risk === 'low').length
    };
    const totalRiskFrames = riskCounts.high + riskCounts.medium + riskCounts.low;
    const riskScore = totalRiskFrames > 0 
        ? Math.round(((riskCounts.low * 100 + riskCounts.medium * 50 + riskCounts.high * 0) / totalRiskFrames))
        : 100;

    const calculateScore = (values: number[], idealMin: number, idealMax: number) => {
        if (values.length === 0) return 80;
        const avg = getAverage(values) || 0;
        if (avg >= idealMin && avg <= idealMax) return 100;
        const distance = avg < idealMin ? idealMin - avg : avg - idealMax;
        return Math.max(0, 100 - distance * 2);
    };

    const shoulderScore = calculateScore(shoulderAngles, 60, 120);
    const hipScore = hipRotations.length > 0 ? Math.min(100, (getAverage(hipRotations) || 0) * 3) : 70;
    const kneeScore = calculateScore(kneeFlexions, 120, 170);
    const overallScore = Math.round((shoulderScore + hipScore + kneeScore + riskScore) / 4);
    
    const getGrade = (score: number) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B+';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C+';
        return 'C';
    };

    const grade = getGrade(overallScore);

    return (
        <div className="min-h-screen bg-white">
            <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 md:py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push(`/strikesense/player?stroke=${strokeType}`)}
                        className="text-neutral-500 hover:text-black flex items-center gap-2 transition font-medium group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm">Back to Video</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/strikesense/history')}
                            className="p-2.5 bg-neutral-100 border border-neutral-200 hover:bg-neutral-200 rounded-lg text-neutral-600 hover:text-black transition"
                        >
                            <Clock className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="p-2.5 bg-neutral-100 border border-neutral-200 hover:bg-neutral-200 rounded-lg text-neutral-600 hover:text-black transition"
                        >
                            <Home className="w-4 h-4" />
                    </button>
                    </div>
                </div>

                {/* Hero Section */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold tracking-wide uppercase mb-4 border border-neutral-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Analysis Complete
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
                        Performance Report
                    </h1>
                    <p className="text-neutral-500 text-sm">
                        {strokeType.charAt(0).toUpperCase() + strokeType.slice(1)} Analysis • {new Date().toLocaleDateString()}
                                </p>
                            </div>

                {/* Grade Card */}
                <div className="bg-neutral-50 rounded-2xl p-6 md:p-8 border border-neutral-200 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-neutral-500 text-sm font-medium mb-1">Overall Score</p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-5xl md:text-6xl font-black text-black">
                                    {grade}
                                </span>
                                <span className="text-2xl md:text-3xl font-bold text-neutral-400">{overallScore}%</span>
                            </div>
                        </div>
                        <div className="w-20 h-20 md:w-24 md:h-24 relative">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="8" className="text-neutral-200" />
                                <circle 
                                    cx="50%" cy="50%" r="45%" fill="none" stroke="black" strokeWidth="8" 
                                    strokeLinecap="round"
                                    strokeDasharray={`${overallScore * 2.83} 283`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Award className="w-8 h-8 md:w-10 md:h-10 text-black" />
                                </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <MetricCard 
                        icon={<Target className="w-4 h-4" />}
                        label="Frames Analyzed"
                        value={frames.length.toString()}
                        subtext={`${summary.duration_sec?.toFixed(1) || '0'}s duration`}
                    />
                    <MetricCard 
                        icon={<Shield className="w-4 h-4" />}
                        label="Form Safety"
                        value={`${riskScore}%`}
                        subtext={riskCounts.high > 0 ? `${riskCounts.high} caution` : 'Looking good'}
                    />
                    <MetricCard 
                        icon={<Activity className="w-4 h-4" />}
                        label="Avg Hip Rotation"
                        value={getAverage(hipRotations)?.toFixed(0) || '--'}
                        subtext="degrees"
                    />
                    <MetricCard 
                        icon={<Zap className="w-4 h-4" />}
                        label="Shoulder Range"
                        value={`${getMin(shoulderAngles)?.toFixed(0) || '--'}-${getMax(shoulderAngles)?.toFixed(0) || '--'}`}
                        subtext="degrees"
                    />
                </div>

                {/* Biomechanics Breakdown */}
                <div className="bg-neutral-50 rounded-2xl p-5 md:p-6 border border-neutral-200 mb-6">
                    <h2 className="text-lg font-semibold text-black mb-5 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-neutral-600" />
                        Biomechanics Breakdown
                    </h2>

                    <div className="space-y-5">
                        <MetricBar 
                            label="Shoulder Mechanics" 
                            value={Math.round(shoulderScore)} 
                            detail={getAverage(shoulderAngles) ? `Avg: ${getAverage(shoulderAngles)?.toFixed(0)}°` : 'No data'}
                        />
                        <MetricBar 
                            label="Hip Power Transfer" 
                            value={Math.round(hipScore)} 
                            detail={getAverage(hipRotations) ? `Avg: ${getAverage(hipRotations)?.toFixed(0)}°` : 'No data'}
                        />
                        <MetricBar 
                            label="Knee Stability" 
                            value={Math.round(kneeScore)} 
                            detail={getAverage(kneeFlexions) ? `Avg: ${getAverage(kneeFlexions)?.toFixed(0)}°` : 'No data'}
                        />
                        <MetricBar 
                            label="Elbow Extension" 
                            value={elbowAngles.length > 0 ? Math.round(calculateScore(elbowAngles, 90, 150)) : 80} 
                            detail={getAverage(elbowAngles) ? `Avg: ${getAverage(elbowAngles)?.toFixed(0)}°` : 'No data'}
                        />
                    </div>
                </div>

                {/* AI Coach Feedback */}
                <div className="bg-neutral-50 rounded-2xl border border-neutral-200 mb-6 overflow-hidden">
                    <button
                        onClick={() => setExpandedCoach(!expandedCoach)}
                        className="w-full p-5 md:p-6 flex items-center justify-between hover:bg-neutral-100 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-semibold text-black">AI Coach Analysis</h3>
                                <p className="text-xs text-neutral-500">Personalized feedback & recommendations</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {llmLoading && <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />}
                            {expandedCoach ? <ChevronUp className="w-5 h-5 text-neutral-500" /> : <ChevronDown className="w-5 h-5 text-neutral-500" />}
                        </div>
                    </button>

                    {expandedCoach && (
                        <div className="px-5 md:px-6 pb-5 md:pb-6">
                            {llmLoading && (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <Loader2 className="w-10 h-10 text-neutral-500 animate-spin mb-3" />
                                    <p className="text-neutral-500 text-sm">Analyzing your technique...</p>
                                </div>
                            )}

                            {llmError && (
                                <div className="bg-neutral-100 border border-neutral-200 rounded-xl p-4 text-center">
                                    <AlertCircle className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
                                    <p className="text-neutral-600 text-sm mb-3">{llmError}</p>
                                    <button
                                        onClick={() => fetchLlmResponse(analysisData)}
                                        className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-sm font-medium transition"
                                    >
                                        Retry
                                            </button>
                                </div>
                            )}

                            {llmResponse && !llmLoading && (
                                <div className="bg-white rounded-xl p-5 border border-neutral-200">
                                    <ReactMarkdown
                                        components={{
                                            h2: ({ children }) => (
                                                <h2 className="text-lg font-bold text-black mt-5 mb-3 first:mt-0">{children}</h2>
                                            ),
                                            h3: ({ children }) => (
                                                <h3 className="text-base font-semibold text-neutral-700 mt-4 mb-2">{children}</h3>
                                            ),
                                            p: ({ children }) => (
                                                <p className="text-neutral-600 mb-3 leading-relaxed text-sm">{children}</p>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="list-disc list-inside text-neutral-600 mb-4 space-y-1.5 text-sm">{children}</ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="list-decimal list-inside text-neutral-600 mb-4 space-y-1.5 text-sm">{children}</ol>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="text-black font-semibold">{children}</strong>
                                            ),
                                            hr: () => <hr className="border-neutral-200 my-5" />,
                                        }}
                                    >
                                        {llmResponse}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => router.push(`/strikesense/player?stroke=${strokeType}`)}
                        className="flex-1 bg-neutral-100 border border-neutral-200 hover:bg-neutral-200 text-black py-3.5 rounded-xl font-semibold transition text-sm"
                    >
                        ← Review Video
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="flex-1 bg-black hover:bg-neutral-800 text-white py-3.5 rounded-xl font-semibold transition text-sm"
                    >
                        New Analysis →
                    </button>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, subtext }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext: string;
}) {
    return (
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-1.5 text-neutral-500 mb-2">
                {icon}
                <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="text-2xl font-bold text-black">{value}</div>
            <div className="text-xs text-neutral-400 mt-0.5">{subtext}</div>
        </div>
    );
}

function MetricBar({ label, value, detail }: { label: string; value: number; detail: string }) {
    return (
        <div>
            <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-medium text-neutral-600">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">{detail}</span>
                    <span className="text-sm font-bold text-black">{value}%</span>
                </div>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-black transition-all duration-700"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-black font-bold animate-pulse">Loading...</div>
            </div>
        }>
            <AnalysisContent />
        </Suspense>
    );
}
