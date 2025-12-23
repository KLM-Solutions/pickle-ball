"use client";

import { useState } from "react";
import {
  Activity,
  Menu,
  User,
  Zap,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { StrokeType, AnalyzeResponse } from "./types";
import ResultsDashboard from "./components/dashboard/ResultsDashboard";

// --- Components ---

function Header() {
  return (
    <header className="flex items-center justify-between py-4 px-6 bg-secondary text-white sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-2">
        <Activity className="text-primary h-6 w-6" />
        <h1 className="text-xl font-bold tracking-tight">StrikeSense</h1>
      </div>
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
        <a href="#" className="hover:text-white transition">History</a>
        <a href="#" className="hover:text-white transition">Analytics</a>
        <a href="#" className="hover:text-white transition">Community</a>
      </nav>
      <div className="flex items-center gap-4">
        <button className="text-xs font-semibold bg-accent hover:bg-orange-600 text-white px-3 py-1.5 rounded-full transition">
          PRO
        </button>
        <User className="h-5 w-5 text-gray-300" />
        <Menu className="h-6 w-6 md:hidden text-gray-300" />
      </div>
    </header>
  );
}

// 1. Selection Screen
function SelectionScreen({ onSelect, onDemo }: { onSelect: (type: StrokeType) => void; onDemo: () => void }) {
  const router = useRouter();

  const options = [
    { id: "serve", label: "Analyze My Serve", icon: Activity, desc: "Power, accuracy, and form" },
    { id: "groundstroke", label: "Groundstrokes", icon: Zap, desc: "Forehand & backhand drive" },
    { id: "dink", label: "Improve My Dinking", icon: Activity, desc: "Control and patience" },
    { id: "overhead", label: "Overhead Smash", icon: TrendingUp, desc: "Timing and extension" },
    { id: "footwork", label: "Footwork Analysis", icon: Clock, desc: "Speed and split-steps" },
    { id: "overall", label: "Overall Form", icon: User, desc: "General biomechanics check" },
  ] as const;

  const handleStrokeSelect = (strokeId: string) => {
    onSelect(strokeId as StrokeType);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-secondary mb-3">What do you want to improve?</h2>
        <p className="text-text-secondary">Select a stroke to get personalized biomechanical insights.</p>

        <button
          onClick={onDemo}
          className="mt-4 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-full transition"
        >
          View Demo Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleStrokeSelect(opt.id)}
            className="flex flex-col items-center text-center p-6 bg-surface-highlight border border-gray-100 rounded-2xl hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all group"
          >
            <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <opt.icon className="h-6 w-6 text-secondary group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-semibold text-lg text-secondary mb-1">{opt.label}</h3>
            <p className="text-sm text-text-secondary">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function Home() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const handleSelect = (type: StrokeType) => {
    // Navigate to new StrikeSense flow
    router.push(`/strikesense/guide?stroke=${type}`);
  };

  const handleDemo = async () => {
    try {
      const response = await fetch("/demo/results.json");
      if (!response.ok) {
        throw new Error("Failed to load demo data");
      }
      const data = await response.json();

      // Ensure the video URL points to our local demo video
      // and frame image paths are correct relative to public
      // Note: The Python script output might have absolute paths or raw filenames
      // We need to ensure they map to something valid if we want images, 
      // but for the video player, just the videoUrl is most important.

      const demoResult: AnalyzeResponse = {
        ...data,
        videoUrl: "/demo/annotated.mp4",
        // Ensure frames rely on the video timestamp mostly, images might be broken 
        // unless we copied them all to public. 
        // For the demo purpose, playing the annotated video is the key experience.
        frames: (data.frames || []).map((r: any, i: number) => {
          // SYNTHETIC DEMO RISKS: Inject fake risks to demonstrate the UI
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
          } else if (i === 105) {
            fakeMetrics.injury_risk = 'medium';
            fakeMetrics.feedback = ['Hip alignment deviation'];
          } else if (i === 130) {
            fakeMetrics.injury_risk = 'high';
            fakeMetrics.feedback = ['Rapid trunk rotation risk'];
          } else if (i === 142) {
            fakeMetrics.injury_risk = 'medium';
            fakeMetrics.feedback = ['Shoulder over-extension'];
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
      alert("Could not load demo analysis. Please check if demo files exist in public/demo.");
    }
  };

  // If in Demo Mode, show Results Dashboard immediately
  if (result) {
    return (
      <ResultsDashboard
        result={result}
        onReset={() => setResult(null)}
        videoFile={videoFile} // Null for demo
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center w-full bg-white">
        <SelectionScreen onSelect={handleSelect} onDemo={handleDemo} />
      </main>

      <footer className="py-6 text-center text-xs text-text-secondary bg-surface border-t border-border">
        <p>© 2024 StrikeSense. Phase 1 MVP – CPU-only person segmentation.</p>
      </footer>
    </div>
  );
}
