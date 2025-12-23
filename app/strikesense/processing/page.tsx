"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, Circle, AlertCircle, RefreshCw, Cloud } from "lucide-react";

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
        // Get video URL from session storage
        const videoUrl = sessionStorage.getItem('videoUrl');
        const cropCoords = sessionStorage.getItem('cropCoords');

        if (!videoUrl) {
          throw new Error("No video URL found. Please re-upload your video.");
        }

        // Parse crop coordinates
        let cropRegion: string | undefined;
        if (cropCoords) {
          const coords = JSON.parse(cropCoords);
          cropRegion = `${coords.x1},${coords.y1},${coords.x2},${coords.y2}`;
        }

        // Stage 1: Sending to cloud
        setStageStatus(0, 'active');
        setOverallProgress(10);

        // Call the API
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl,
            strokeType,
            cropRegion,
            step: 3,
          }),
        });

        // Update progress during API call
        setStageStatus(0, 'complete');
        setCurrentStage(1);

        // Simulate stages while waiting for response
        // (The actual processing happens on RunPod)
        for (let i = 1; i < stages.length - 1; i++) {
          setStageStatus(i, 'active');
          setOverallProgress(20 + (i * 15));
          await new Promise(resolve => setTimeout(resolve, 2000));
          setStageStatus(i, 'complete');
          setCurrentStage(i + 1);
        }

        // Final stage
        setStageStatus(stages.length - 1, 'active');
        setOverallProgress(85);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Complete final stage
        setStageStatus(stages.length - 1, 'complete');
        setOverallProgress(100);

        // Store result and navigate
        sessionStorage.setItem('analysisResult', JSON.stringify(result));
        console.log('Analysis complete:', result);

        // Short delay to show completion
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl border border-red-100">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Analysis Failed</h1>
          <p className="text-gray-500 mb-6 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="mt-3 text-sm text-gray-500 hover:text-gray-900 underline"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 font-sans">
      <div className="max-w-2xl w-full text-center">
        <div className="relative">
          <Loader2 className="w-16 h-16 mx-auto mb-2 animate-spin text-[#00BFA5]" />
          <Cloud className="w-6 h-6 absolute top-0 right-1/2 translate-x-12 text-[#1A237E] animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-[#1A237E]">Analyzing Your Performance</h1>
        <p className="text-gray-500 mb-2">GPU-powered cloud analysis in progress...</p>
        <p className="text-xs text-gray-400 mb-8">Processing on RunPod Serverless</p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2 text-gray-500">
            <span>Progress</span>
            <span className="font-bold text-[#1A237E]">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-[#00BFA5] transition-all duration-1000 ease-linear shadow-lg"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Processing Stages */}
        <div className="space-y-3">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`p-4 rounded-xl border-2 transition-all duration-500 ${stage.status === 'complete'
                ? 'bg-teal-50 border-[#00BFA5] scale-100 opacity-100'
                : stage.status === 'active'
                  ? 'bg-white border-[#1A237E]/20 scale-102 shadow-lg'
                  : 'bg-white border-gray-100 scale-100 opacity-60'
                }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl flex-shrink-0 drop-shadow-sm">{stage.icon}</span>
                <span className={`flex-1 text-left font-bold ${stage.status === 'active' ? 'text-[#1A237E]' : 'text-gray-600'
                  }`}>
                  {stage.label}
                </span>
                {stage.status === 'complete' && (
                  <CheckCircle className="w-6 h-6 text-[#00BFA5] animate-in zoom-in" />
                )}
                {stage.status === 'active' && (
                  <Loader2 className="w-6 h-6 text-[#00BFA5] animate-spin" />
                )}
                {stage.status === 'pending' && (
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading analysis...</div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
