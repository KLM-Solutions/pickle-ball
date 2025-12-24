"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight, Zap, Target, Shield } from "lucide-react";
import { StrokeType, AnalyzeResponse } from "./types";
import ResultsDashboard from "./components/dashboard/ResultsDashboard";

// Stroke options for pickleball
const STROKE_OPTIONS = [
  {
    id: "serve",
    title: "Serve",
    description: "Analyze your underhand serve technique, contact point, and power generation",
    icon: "🎾",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    shadowColor: "shadow-emerald-500/30",
    stats: "Contact • Power • Form"
  },
  {
    id: "dink",
    title: "Dink",
    description: "Perfect your soft game with knee bend analysis and paddle control",
    icon: "🤏",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    shadowColor: "shadow-violet-500/30",
    stats: "Control • Posture • Touch"
  },
  {
    id: "groundstroke",
    title: "Drive",
    description: "Analyze forehand and backhand drives for maximum power and accuracy",
    icon: "💪",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    shadowColor: "shadow-orange-500/30",
    stats: "Speed • Rotation • Follow-through"
  },
  {
    id: "overhead",
    title: "Overhead",
    description: "Perfect your smash with extension analysis and timing feedback",
    icon: "⚡",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    shadowColor: "shadow-blue-500/30",
    stats: "Extension • Timing • Power"
  },
] as const;

export default function Home() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [hoveredStroke, setHoveredStroke] = useState<string | null>(null);

  const handleStrokeSelect = (strokeId: string) => {
    router.push(`/strikesense/guide?stroke=${strokeId}`);
  };

  const handleDemo = async () => {
    try {
      const response = await fetch("/demo/results.json");
      if (!response.ok) throw new Error("Failed to load demo data");
      const data = await response.json();

      const demoResult: AnalyzeResponse = {
        ...data,
        videoUrl: "/demo/annotated.mp4",
        frames: (data.frames || []).map((r: any, i: number) => {
          const fakeMetrics = { ...(r.metrics || {}) };
          if (i === 15) {
            fakeMetrics.injury_risk = 'high';
            fakeMetrics.feedback = ['Contact point too high (Above waist)'];
          } else if (i === 45) {
            fakeMetrics.injury_risk = 'high';
            fakeMetrics.feedback = ['Deep flexion instability'];
          } else if (i === 80) {
            fakeMetrics.injury_risk = 'medium';
            fakeMetrics.feedback = ['Unstable landing mechanics'];
          } else if (i === 130) {
            fakeMetrics.injury_risk = 'high';
            fakeMetrics.feedback = ['Rapid trunk rotation risk'];
          }
          return {
            ...r,
            metrics: fakeMetrics,
            timestampSec: r.timestampSec || r.metrics?.time_sec || 0
          };
        })
      };

      setResult(demoResult);
      setVideoFile(null);
    } catch (error) {
      console.error("Demo load failed:", error);
      alert("Could not load demo analysis.");
    }
  };

  // Show results dashboard if demo is loaded
  if (result) {
    return (
      <ResultsDashboard
        result={result}
        onReset={() => setResult(null)}
        videoFile={videoFile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-x-hidden">
      {/* Animated background pattern */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-5 md:top-20 md:left-10 w-48 md:w-72 h-48 md:h-72 bg-emerald-500 rounded-full filter blur-[100px] md:blur-[128px] animate-pulse" />
        <div className="absolute bottom-10 right-5 md:bottom-20 md:right-10 w-64 md:w-96 h-64 md:h-96 bg-violet-500 rounded-full filter blur-[100px] md:blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 md:w-64 h-40 md:h-64 bg-orange-500 rounded-full filter blur-[100px] md:blur-[128px] animate-pulse delay-500" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-lg md:text-xl shadow-lg shadow-emerald-500/30">
              🏓
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">StrikeSense</h1>
              <p className="text-[10px] md:text-xs text-slate-400 hidden sm:block">AI Stroke Analysis</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-Powered Biomechanics
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => router.push('/strikesense/history')}
            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-2 text-xs md:text-sm font-medium text-slate-400 border border-white/10 rounded-full hover:bg-white/5 hover:text-white transition-all duration-300"
          >
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={handleDemo}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-emerald-400 border border-emerald-500/30 rounded-full hover:bg-emerald-500/10 transition-all duration-300"
          >
            Demo
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
            Analyze Your
            <span className="block bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Pickleball Stroke
            </span>
          </h2>
          
          <p className="text-sm md:text-lg text-slate-400 max-w-2xl mx-auto mb-6 md:mb-8 px-4">
            Upload a video and get instant feedback on your technique. 
            Track joint angles, detect form issues, and improve your game.
          </p>

          {/* Stats - Mobile Scrollable */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs md:text-sm overflow-x-auto pb-2">
            <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
              <span className="text-xl md:text-2xl font-bold text-white">33</span>
              <span className="text-slate-400">Body Points</span>
            </div>
            <div className="w-px h-6 md:h-8 bg-white/20 flex-shrink-0" />
            <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
              <span className="text-xl md:text-2xl font-bold text-white">30</span>
              <span className="text-slate-400">FPS Analysis</span>
            </div>
            <div className="w-px h-6 md:h-8 bg-white/20 flex-shrink-0" />
            <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
              <span className="text-xl md:text-2xl font-bold text-white">Real-time</span>
              <span className="text-slate-400">Feedback</span>
            </div>
          </div>
        </div>

        {/* Stroke Selection */}
        <div className="mb-8">
          <h3 className="text-center text-[10px] md:text-sm font-medium text-slate-400 uppercase tracking-wider mb-6 md:mb-8">
            Select Your Stroke Type
          </h3>
          
          {/* Mobile: 2 columns, Desktop: 4 columns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {STROKE_OPTIONS.map((stroke) => (
              <button
                key={stroke.id}
                onClick={() => handleStrokeSelect(stroke.id)}
                onMouseEnter={() => setHoveredStroke(stroke.id)}
                onMouseLeave={() => setHoveredStroke(null)}
                className={`
                  relative group p-4 md:p-6 rounded-2xl border border-white/10 
                  bg-white/5 backdrop-blur-sm
                  hover:border-white/20 hover:bg-white/10
                  transition-all duration-300 ease-out
                  active:scale-[0.98] touch-manipulation
                  ${hoveredStroke === stroke.id ? 'scale-[1.02] shadow-2xl' : ''}
                `}
              >
                {/* Gradient overlay on hover */}
                <div className={`
                  absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 
                  bg-gradient-to-br ${stroke.color} 
                  transition-opacity duration-500
                `} style={{ opacity: hoveredStroke === stroke.id ? 0.1 : 0 }} />
                
                {/* Icon */}
                <div className={`
                  w-12 h-12 md:w-14 md:h-14 rounded-xl mb-3 md:mb-4 flex items-center justify-center text-2xl md:text-3xl
                  bg-gradient-to-br ${stroke.color} shadow-lg ${stroke.shadowColor}
                  group-hover:scale-110 transition-transform duration-300
                `}>
                  {stroke.icon}
                </div>
                
                {/* Content */}
                <h4 className="text-base md:text-xl font-bold mb-1 md:mb-2 text-white group-hover:text-white transition-colors text-left">
                  {stroke.title}
                </h4>
                <p className="text-xs md:text-sm text-slate-400 mb-2 md:mb-4 line-clamp-2 group-hover:text-slate-300 transition-colors text-left hidden sm:block">
                  {stroke.description}
                </p>
                
                {/* Stats tag */}
                <div className="text-[10px] md:text-xs text-slate-500 font-medium text-left">
                  {stroke.stats}
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-4 md:top-6 right-4 md:right-6 w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12 md:mt-20 text-center">
          <h3 className="text-[10px] md:text-sm font-medium text-slate-400 uppercase tracking-wider mb-6 md:mb-8">
            How It Works
          </h3>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-16">
            {[
              { step: "1", title: "Upload Video", desc: "Record your stroke from any angle", icon: Target },
              { step: "2", title: "Select Player", desc: "Draw a box around yourself", icon: Zap },
              { step: "3", title: "Get Analysis", desc: "View biomechanics & feedback", icon: Shield },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-base md:text-lg font-bold mb-2 md:mb-3 shadow-lg shadow-emerald-500/30">
                  {item.step}
                </div>
                <h4 className="font-semibold text-white mb-0.5 md:mb-1 text-sm md:text-base">{item.title}</h4>
                <p className="text-xs md:text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-10 md:hidden">
          <button
            onClick={() => handleStrokeSelect('serve')}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform"
          >
            Start Analysis →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 md:py-8 border-t border-white/10 mt-8">
        <p className="text-xs md:text-sm text-slate-500 px-4">
          © 2024 StrikeSense • AI-Powered Pickleball Analysis
        </p>
      </footer>
    </div>
  );
}
