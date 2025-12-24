"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated background pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500 rounded-full filter blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500 rounded-full filter blur-[128px] animate-pulse delay-500" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/30">
              🏓
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">StrikeSense</h1>
              <p className="text-xs text-slate-400">AI Stroke Analysis</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-Powered Biomechanics
          </div>
        </div>
        
        <button
          onClick={handleDemo}
          className="px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/30 rounded-full hover:bg-emerald-500/10 transition-all duration-300"
        >
          View Demo
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Analyze Your
            <span className="block bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Pickleball Stroke
            </span>
          </h2>
          
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Upload a video and get instant feedback on your technique. 
            Track joint angles, detect form issues, and improve your game.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">33</span>
              <span className="text-slate-400">Body Points</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">30</span>
              <span className="text-slate-400">FPS Analysis</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">Real-time</span>
              <span className="text-slate-400">Feedback</span>
            </div>
          </div>
        </div>

        {/* Stroke Selection */}
        <div className="mb-8">
          <h3 className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-8">
            Select Your Stroke Type
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STROKE_OPTIONS.map((stroke) => (
              <button
                key={stroke.id}
                onClick={() => handleStrokeSelect(stroke.id)}
                onMouseEnter={() => setHoveredStroke(stroke.id)}
                onMouseLeave={() => setHoveredStroke(null)}
                className={`
                  relative group p-6 rounded-2xl border border-white/10 
                  bg-white/5 backdrop-blur-sm
                  hover:border-white/20 hover:bg-white/10
                  transition-all duration-500 ease-out
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
                  w-14 h-14 rounded-xl mb-4 flex items-center justify-center text-3xl
                  bg-gradient-to-br ${stroke.color} shadow-lg
                  group-hover:scale-110 transition-transform duration-300
                `}>
                  {stroke.icon}
                </div>
                
                {/* Content */}
                <h4 className="text-xl font-bold mb-2 text-white group-hover:text-white transition-colors">
                  {stroke.title}
                </h4>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2 group-hover:text-slate-300 transition-colors">
                  {stroke.description}
                </p>
                
                {/* Stats tag */}
                <div className="text-xs text-slate-500 font-medium">
                  {stroke.stats}
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 text-center">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-8">
            How It Works
          </h3>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            {[
              { step: "1", title: "Upload Video", desc: "Record your stroke from any angle" },
              { step: "2", title: "Select Player", desc: "Draw a box around yourself" },
              { step: "3", title: "Get Analysis", desc: "View biomechanics & feedback" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg font-bold mb-3 shadow-lg shadow-emerald-500/30">
                  {item.step}
                </div>
                <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 border-t border-white/10">
        <p className="text-sm text-slate-500">
          © 2024 StrikeSense • AI-Powered Pickleball Analysis
        </p>
      </footer>
    </div>
  );
}
