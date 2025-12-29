"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft, Activity, TrendingUp, Award,
    Zap, Target, MessageSquare, Clock, Home,
    ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Shield,
    Download, Loader2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const dynamic = 'force-dynamic';

function AnalysisContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [expandedCoach, setExpandedCoach] = useState(true);
    
    const [llmResponse, setLlmResponse] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedResult = sessionStorage.getItem('analysisResult');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                setAnalysisData(parsed);
                
                // Use cached LLM response from database
                if (parsed.llm_response) {
                    setLlmResponse(parsed.llm_response);
                }
            } catch (e) {
                router.push('/strikesense/upload');
            }
        } else {
            setTimeout(() => router.push('/strikesense/upload'), 1000);
        }
    }, [router]);

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

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;
        
        setPdfLoading(true);
        try {
            // Capture the report content as canvas
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 10;
            
            // Calculate total height needed
            const scaledHeight = imgHeight * ratio;
            const pageHeight = pdfHeight - 20; // Account for margins
            
            if (scaledHeight <= pageHeight) {
                // Content fits on one page
                pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, scaledHeight);
            } else {
                // Multi-page handling
                let position = 0;
                const pageCount = Math.ceil(scaledHeight / pageHeight);
                
                for (let i = 0; i < pageCount; i++) {
                    if (i > 0) {
                        pdf.addPage();
                    }
                    
                    const srcY = (position / ratio);
                    const srcHeight = Math.min(pageHeight / ratio, imgHeight - srcY);
                    
                    // Create a temporary canvas for this page section
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = imgWidth;
                    tempCanvas.height = srcHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    if (tempCtx) {
                        tempCtx.drawImage(canvas, 0, srcY, imgWidth, srcHeight, 0, 0, imgWidth, srcHeight);
                        const pageImgData = tempCanvas.toDataURL('image/png');
                        pdf.addImage(pageImgData, 'PNG', imgX, imgY, imgWidth * ratio, srcHeight * ratio);
                    }
                    
                    position += pageHeight;
                }
            }
            
            pdf.save(`strikesense-report-${strokeType}-${Date.now()}.pdf`);
        } catch (error) {
            console.error('PDF download error:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setPdfLoading(false);
        }
    };

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
                            onClick={handleDownloadPDF}
                            disabled={pdfLoading}
                            className="p-2.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 rounded-lg text-white transition flex items-center gap-1.5"
                            title="Download PDF Report"
                        >
                            {pdfLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                        </button>
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

                {/* Report Content - for PDF capture */}
                <div ref={reportRef} className="bg-white">
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
                            {expandedCoach ? <ChevronUp className="w-5 h-5 text-neutral-500" /> : <ChevronDown className="w-5 h-5 text-neutral-500" />}
                        </div>
                    </button>

                    {expandedCoach && (
                        <div className="px-5 md:px-6 pb-5 md:pb-6">
                            {llmResponse ? (
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
                            ) : (
                                <div className="bg-neutral-100 border border-neutral-200 rounded-xl p-4 text-center">
                                    <AlertCircle className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                                    <p className="text-neutral-500 text-sm">
                                        AI coaching feedback will be available once the analysis is complete.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                </div> {/* End of report ref */}

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
