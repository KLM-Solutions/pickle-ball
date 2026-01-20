"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, Circle, AlertCircle, RefreshCw, Home, Bell, Copy, Check, ExternalLink, Play, Clock } from "lucide-react";
import { isDemoMode, getDemoAnalysisResult } from "@/lib/demo/demoData";

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
    { id: 'biomechanics', label: 'Analyzing technique', icon: '📊', status: 'pending' },
    { id: 'insights', label: 'Generating insights', icon: '✨', status: 'pending' }
  ]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobCreated, setJobCreated] = useState(false);
  const [jobCompleted, setJobCompleted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasStarted = useRef(false);

  const setStageStatus = (index: number, status: 'pending' | 'active' | 'complete') => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        new Notification('StrikeSense', {
          body: 'Notifications enabled! We\'ll notify you when analysis is complete.',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const sendCompletionNotification = () => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Analysis Complete! 🎾', {
        body: 'Your stroke analysis is ready. Click to view results.',
        icon: '/favicon.ico',
        tag: 'analysis-complete',
      });
    }
  };

  const copyJobId = () => {
    if (jobId) {
      navigator.clipboard.writeText(jobId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const runAnalysis = async () => {
      try {
        // CHECK FOR DEMO MODE - Use simulated progress
        if (isDemoMode()) {
          console.log('Demo mode: Simulating analysis...');

          // Simulate processing stages
          for (let i = 0; i < stages.length; i++) {
            setStageStatus(i, 'active');
            setOverallProgress(20 + (i * 15));
            await new Promise(r => setTimeout(r, 800)); // 800ms per stage
            setStageStatus(i, 'complete');
          }

          setOverallProgress(100);
          setJobCompleted(true);
          setJobId('demo-session');

          // Store demo results
          sessionStorage.setItem('analysisResult', JSON.stringify(getDemoAnalysisResult()));
          sendCompletionNotification();
          return;
        }

        // REAL MODE - Call API
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
            useWebhook: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
        }

        const startResult = await response.json();
        const newJobId = startResult.job_id;

        if (!newJobId) {
          throw new Error("No job ID returned from server");
        }

        setJobId(newJobId);
        setJobCreated(true);
        sessionStorage.setItem('currentJobId', newJobId);

        setStageStatus(0, 'complete');
        setOverallProgress(20);

        let pollCount = 0;
        const maxPolls = 300;
        const pollInterval = 1000;

        while (pollCount < maxPolls) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          pollCount++;

          const statusResponse = await fetch(`/api/analyze/status?job_id=${newJobId}`);

          if (!statusResponse.ok) {
            continue;
          }

          const statusData = await statusResponse.json();

          if (statusData.status === 'processing') {
            const stage = Math.min(Math.floor(pollCount / 15), stages.length - 2);
            for (let i = 1; i <= stage; i++) {
              if (stages[i].status !== 'complete') {
                setStageStatus(i, 'complete');
              }
            }
            if (stage + 1 < stages.length - 1) {
              setStageStatus(stage + 1, 'active');
            }
            setOverallProgress(Math.min(20 + (stage * 15), 80));
          }

          if (statusData.status === 'completed') {
            for (let i = 0; i < stages.length; i++) {
              setStageStatus(i, 'complete');
            }
            setOverallProgress(100);
            setJobCompleted(true);
            sendCompletionNotification();
            sessionStorage.setItem('analysisResult', JSON.stringify({
              ...statusData.result,
              videoUrl: statusData.videoUrl || statusData.result?.videoUrl,
            }));
            return;
          }

          if (statusData.status === 'failed') {
            throw new Error(statusData.error_message || 'Analysis failed');
          }
        }

        throw new Error('Analysis timed out. Please try again with a shorter video.');

      } catch (err: any) {
        setError(err.message || 'Analysis failed. Please try again.');
      }
    };

    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Completed state
  if (jobCompleted && jobId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="relative z-10 max-w-md w-full text-center bg-neutral-50 border border-neutral-200 p-6 md:p-8 rounded-xl md:rounded-2xl">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-5 bg-black rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-black">Analysis Complete! 🎾</h1>
          <p className="text-neutral-500 mb-6 text-sm md:text-base">Your stroke analysis is ready to view</p>

          <button
            onClick={() => router.push(`/strikesense/player?stroke=${strokeType}&job_id=${jobId}`)}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold transition text-sm md:text-base mb-3"
          >
            <Play className="w-5 h-5" /> View Results
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-black rounded-xl text-sm font-medium transition"
            >
              <Home className="w-4 h-4" /> Home
            </button>
            <button
              onClick={() => router.push('/strikesense/history')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-black rounded-xl text-sm font-medium transition"
            >
              <Clock className="w-4 h-4" /> History
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="relative z-10 max-w-md w-full text-center bg-neutral-50 border border-neutral-200 p-6 md:p-8 rounded-xl md:rounded-2xl">
          <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-neutral-200 rounded-full flex items-center justify-center">
            <AlertCircle className="w-7 h-7 md:w-8 md:h-8 text-neutral-500" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold mb-1.5 md:mb-2 text-black">Analysis Failed</h1>
          <p className="text-neutral-500 mb-5 md:mb-6 text-xs md:text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold transition text-sm md:text-base"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="mt-3 md:mt-4 flex items-center justify-center gap-2 text-xs md:text-sm text-neutral-500 hover:text-black transition w-full"
          >
            <Home className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="relative z-10 max-w-xl w-full text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 text-black">Analyzing Your Stroke</h1>
        <p className="text-neutral-500 mb-1.5 md:mb-2 text-sm md:text-base">Analyzing your technique</p>
        <p className="text-[10px] md:text-xs text-neutral-400 mb-6 md:mb-8">This may take a moment</p>

        {/* Job Created Success Card */}
        {jobCreated && jobId && (
          <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-black" />
              <span className="text-black font-semibold text-sm">Job Created Successfully!</span>
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-neutral-500 text-xs">Job ID:</span>
              <code className="bg-white border border-neutral-200 px-2 py-1 rounded text-xs text-black font-mono">
                {jobId.slice(0, 8)}...
              </code>
              <button
                onClick={copyJobId}
                className="text-neutral-500 hover:text-black transition p-1"
                title="Copy full Job ID"
              >
                {copied ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-neutral-500 text-xs mb-4">
              You can leave this page and check results later in{' '}
              <span className="text-black">History</span>
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => router.push('/')}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-200 hover:bg-neutral-300 text-black rounded-lg text-xs font-medium transition"
              >
                <Home className="w-3.5 h-3.5" />
                Go Home
              </button>

              <button
                onClick={() => router.push('/strikesense/history')}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-200 hover:bg-neutral-300 text-black rounded-lg text-xs font-medium transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View History
              </button>
            </div>
          </div>
        )}

        {/* Notification Permission */}
        {jobCreated && !notificationsEnabled && 'Notification' in window && (
          <div className="mb-6 max-w-md mx-auto">
            <button
              onClick={requestNotifications}
              className="flex items-center justify-center gap-2 w-full py-3 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium transition"
            >
              <Bell className="w-4 h-4" />
              Enable Notifications
              <span className="text-neutral-500 text-xs ml-1">(get notified when complete)</span>
            </button>
          </div>
        )}

        {notificationsEnabled && (
          <div className="mb-6 flex items-center justify-center gap-2 text-xs text-black">
            <Bell className="w-4 h-4" />
            Notifications enabled - we&apos;ll alert you when done
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8 md:mb-10 max-w-md mx-auto px-2">
          <div className="flex justify-between text-xs md:text-sm mb-2">
            <span className="text-neutral-400">Progress</span>
            <span className="font-bold text-black">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-2.5 md:h-3 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-1000 ease-linear"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Processing Stages */}
        <div className="space-y-2 md:space-y-3 max-w-md mx-auto px-2">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`
                p-3 md:p-4 rounded-lg md:rounded-xl border transition-all duration-500
                ${stage.status === 'complete'
                  ? 'bg-neutral-50 border-neutral-300'
                  : stage.status === 'active'
                    ? 'bg-neutral-50 border-black scale-[1.02]'
                    : 'bg-neutral-50 border-neutral-200 opacity-50'
                }
              `}
            >
              <div className="flex items-center gap-3 md:gap-4">
                <span className="text-xl md:text-2xl flex-shrink-0">{stage.icon}</span>
                <span className={`flex-1 text-left font-medium text-xs md:text-sm ${stage.status === 'active' ? 'text-black' :
                  stage.status === 'complete' ? 'text-neutral-700' : 'text-neutral-400'
                  }`}>
                  {stage.label}
                </span>
                {stage.status === 'complete' && (
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-black" />
                )}
                {stage.status === 'active' && (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-black animate-spin" />
                )}
                {stage.status === 'pending' && (
                  <Circle className="w-4 h-4 md:w-5 md:h-5 text-neutral-300" />
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black font-bold animate-pulse">Loading...</div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
