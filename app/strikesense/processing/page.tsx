"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, Circle, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

type ProcessingStage = {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'active' | 'complete';
};

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strokeType = searchParams.get('stroke') || 'serve';

  const [stages, setStages] = useState<ProcessingStage[]>([
    { id: 'upload', label: 'Sending to cloud', icon: '☁️', status: 'pending' },
    { id: 'pose', label: 'Detecting pose', icon: '🤖', status: 'pending' },
    { id: 'strokes', label: 'Classifying strokes', icon: '🎾', status: 'pending' },
    { id: 'biomechanics', label: 'Calculating biomechanics', icon: '📊', status: 'pending' },
    { id: 'insights', label: 'Generating insights', icon: '✨', status: 'pending' }
  ]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(0);

  const setStageStatus = (index: number, status: 'pending' | 'active' | 'complete') => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        const videoUrl = sessionStorage.getItem('videoUrl');
        const cropCoords = sessionStorage.getItem('cropCoords');

        if (!videoUrl) {
          throw new Error("No video URL found. Please re-upload your video.");
        }

        let cropRegion: string | undefined;
        if (cropCoords) {
          const coords = JSON.parse(cropCoords);
          cropRegion = `${coords.x1},${coords.y1},${coords.x2},${coords.y2}`;
        }

        // Stage 1: Sending to cloud
        setStageStatus(0, 'active');
        setOverallProgress(10);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl,
            strokeType,
            cropRegion,
            step: 1,
          }),
        });

        setStageStatus(0, 'complete');
        setCurrentStage(1);

        for (let i = 1; i < stages.length - 1; i++) {
          setStageStatus(i, 'active');
          setOverallProgress(20 + (i * 15));
          await new Promise(resolve => setTimeout(resolve, 2000));
          setStageStatus(i, 'complete');
          setCurrentStage(i + 1);
        }

        setStageStatus(stages.length - 1, 'active');
        setOverallProgress(85);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
        }

        const result = await response.json();

        setStageStatus(stages.length - 1, 'complete');
        setOverallProgress(100);

        sessionStorage.setItem('analysisResult', JSON.stringify(result));
        console.log('Analysis complete:', result);

        await new Promise(resolve => setTimeout(resolve, 500));
        router.push(`/strikesense/player?stroke=${strokeType}`);

      } catch (err: any) {
        console.error('Analysis error:', err);
        setError(err.message || 'Analysis failed. Please try again.');
      }
    };

    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        {/* Background */}
        <div className="fixed inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500 rounded-full filter blur-[128px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500 rounded-full filter blur-[128px]" />
        </div>

        <div className="relative z-10 max-w-md w-full text-center bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">Analysis Failed</h1>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 text-white rounded-xl font-bold transition"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500 rounded-full filter blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500 rounded-full filter blur-[128px] animate-pulse delay-500" />
      </div>

      <div className="relative z-10 max-w-xl w-full text-center">
        {/* Spinner */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 p-1 animate-spin-slow">
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 text-white">Analyzing Your Stroke</h1>
        <p className="text-slate-400 mb-2">GPU-powered AI analysis in progress</p>
        <p className="text-xs text-slate-500 mb-8">Processing on RunPod Serverless</p>

        {/* Progress Bar */}
        <div className="mb-10 max-w-md mx-auto">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">Progress</span>
            <span className="font-bold text-emerald-400">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-linear shadow-lg shadow-emerald-500/50"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Processing Stages */}
        <div className="space-y-3 max-w-md mx-auto">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`
                p-4 rounded-xl border backdrop-blur-sm transition-all duration-500
                ${stage.status === 'complete'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : stage.status === 'active'
                    ? 'bg-white/10 border-white/20 scale-[1.02]'
                    : 'bg-white/5 border-white/10 opacity-50'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl flex-shrink-0">{stage.icon}</span>
                <span className={`flex-1 text-left font-medium ${
                  stage.status === 'active' ? 'text-white' : 
                  stage.status === 'complete' ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {stage.label}
                </span>
                {stage.status === 'complete' && (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                {stage.status === 'active' && (
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                )}
                {stage.status === 'pending' && (
                  <Circle className="w-5 h-5 text-slate-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 font-bold animate-pulse">Loading...</div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
