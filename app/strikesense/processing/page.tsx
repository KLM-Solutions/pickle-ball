"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, Circle, AlertCircle, RefreshCw } from "lucide-react";

import { getVideoFile } from "../../../lib/videoStorage";

export const dynamic = 'force-dynamic';

type ProcessingStage = {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'active' | 'complete';
};

// Separate component that uses search params
function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strokeType = searchParams.get('stroke') || 'serve';

  // Use refs to track completion status without triggering re-renders inside the loop
  const apiCompleteRef = useRef(false);
  const analysisResultRef = useRef<any>(null);
  const apiErrorRef = useRef<string | null>(null);

  const [stages, setStages] = useState<ProcessingStage[]>([
    { id: 'loading', label: 'Loading video', icon: '📹', status: 'pending' },
    { id: 'pose', label: 'Detecting pose', icon: '🤖', status: 'pending' },
    { id: 'strokes', label: 'Classifying strokes', icon: '🎾', status: 'pending' },
    { id: 'biomechanics', label: 'Calculating biomechanics', icon: '📊', status: 'pending' },
    { id: 'insights', label: 'Generating insights', icon: '✨', status: 'pending' }
  ]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLongWait, setIsLongWait] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to update a specific stage
  const setStageStatus = (index: number, status: 'pending' | 'active' | 'complete') => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  useEffect(() => {
    const runSequence = async () => {
      // 1. Trigger API in background
      const apiPromise = (async () => {
        try {
          const videoFile = await getVideoFile();
          const cropCoords = sessionStorage.getItem('cropCoords');

          if (!videoFile || !cropCoords) throw new Error("Missing inputs. Please re-upload video.");

          const coords = JSON.parse(cropCoords);
          const formData = new FormData();
          formData.append('video', videoFile);
          formData.append('strokeType', strokeType);
          formData.append('targetPoint', `${(coords.x1 + coords.x2) / 2},${(coords.y1 + coords.y2) / 2}`);
          // Send x1,y1,x2,y2 to Python
          formData.append('cropRegion', `${coords.x1},${coords.y1},${coords.x2},${coords.y2}`);
          formData.append('trackBall', 'false');

          const res = await fetch('/api/analyze', { method: 'POST', body: formData });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Analysis failed: ${res.statusText} (${errText.substring(0, 50)}...)`);
          }

          const json = await res.json();
          analysisResultRef.current = json;
          apiCompleteRef.current = true;
        } catch (err: any) {
          console.error("API Error", err);
          apiErrorRef.current = err.message || "Unknown error occurred";
          apiCompleteRef.current = true; // Set complete so loop can exit and show error
        }
      })();

      // 2. Run Visual Sequence (5 seconds per step)
      const STEP_DELAY = 5000;

      for (let i = 0; i < stages.length; i++) {
        // If error occurred previously, stop
        if (apiErrorRef.current) break;

        // Activate current stage
        setStageStatus(i, 'active');

        // Update progress bar smoothly during the wait
        const startProgress = (i / stages.length) * 100;
        const endProgress = ((i + 1) / stages.length) * 100;
        setOverallProgress(startProgress);

        // Wait...
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));

        // If this is the last stage (Insights), we MUST ensure API is done
        if (i === stages.length - 1) {
          let waitTime = 0;
          // Wait until API finishes if it hasn't yet
          while (!apiCompleteRef.current) {
            await new Promise(resolve => setTimeout(resolve, 500));
            waitTime += 500;
            // If waiting more than 15s at this stage (total > 35s), show "Long Wait" message
            if (waitTime > 15000) {
              setIsLongWait(true);
            }
          }
        }

        // Check error again after wait
        if (apiErrorRef.current) break;

        // Complete stage
        setStageStatus(i, 'complete');
        setOverallProgress(endProgress);
      }

      // 3. Final Check
      if (apiErrorRef.current) {
        setError(apiErrorRef.current);
        setOverallProgress(100); // Visual completion of fail
      } else if (analysisResultRef.current) {
        // FIXED: Store analysis result and redirect to analysis page instead of player
        sessionStorage.setItem('analysisResult', JSON.stringify(analysisResultRef.current));
        console.log('Analysis complete, stored result:', analysisResultRef.current);
        // Redirect to player page which shows the video and real-time metrics
        setTimeout(() => {
          router.push(`/strikesense/player?stroke=${strokeType}`);
        }, 500);
      }
    };

    runSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl border border-red-100">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Analysis Failed</h1>
          <p className="text-gray-500 mb-6 text-sm">{error}</p>
          <div className="text-xs bg-gray-100 p-3 rounded mb-6 text-left font-mono overflow-auto max-h-32">
            Tip: If this is the first run, dependencies might be installing. Try running 'python track.py' manually in terminal to see detailed logs.
          </div>
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
        <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin text-[#00BFA5]" />
        <h1 className="text-3xl font-bold mb-2 text-[#1A237E]">Analyzing Your Performance</h1>
        <p className="text-gray-500 mb-8">Detailed analysis in progress...</p>

        {isLongWait && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-center justify-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            Setting up AI models (First run may take 1-2 mins)...
          </div>
        )}

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