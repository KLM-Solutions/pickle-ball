"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight, Zap, Target, Shield } from "lucide-react";

const STROKE_OPTIONS = [
  {
    id: "serve",
    title: "Serve",
    description: "Analyze your underhand serve technique, contact point, and power generation",
    icon: "🎾",
    stats: "Contact • Power • Form"
  },
  {
    id: "dink",
    title: "Dink",
    description: "Perfect your soft game with knee bend analysis and paddle control",
    icon: "🤏",
    stats: "Control • Posture • Touch"
  },
  {
    id: "groundstroke",
    title: "Drive",
    description: "Analyze forehand and backhand drives for maximum power and accuracy",
    icon: "💪",
    stats: "Speed • Rotation • Follow-through"
  },
  {
    id: "overhead",
    title: "Overhead",
    description: "Perfect your smash with extension analysis and timing feedback",
    icon: "⚡",
    stats: "Extension • Timing • Power"
  },
] as const;

export default function Home() {
  const router = useRouter();
  const [hoveredStroke, setHoveredStroke] = useState<string | null>(null);

  const handleStrokeSelect = (strokeId: string) => {
    router.push(`/strikesense/guide?stroke=${strokeId}`);
  };

  const handleDemo = async () => {
    try {
      const response = await fetch("/demo/results.json");
      if (!response.ok) throw new Error("Failed to load demo data");
      const data = await response.json();

      // Build properly structured frames
      const frames = (data.frames || []).map((r: any, i: number) => {
        // Base metrics
        const metrics = {
          hip_rotation_deg: 35 + Math.random() * 20,
          right_shoulder_abduction: 80 + Math.random() * 30,
          right_knee_flexion: 130 + Math.random() * 20,
          right_elbow_flexion: 110 + Math.random() * 30,
          ...(r.metrics || {})
        };
        
        // Build injury_risks array and risk level
        let injury_risk: 'low' | 'medium' | 'high' = 'low';
        const injury_risks: any[] = [];
        const feedback: string[] = [];
        
        if (i === 15 || i === 45 || i === 130) {
          injury_risk = 'high';
          injury_risks.push({
            type: i === 15 ? 'shoulder_overuse' : i === 45 ? 'knee_stress' : 'poor_kinetic_chain',
            severity: 'high',
            angle: i === 15 ? 145 : i === 45 ? 85 : 20,
            message: i === 15 ? 'Shoulder abduction 145° exceeds safe range' 
                   : i === 45 ? 'Deep knee flexion (85°) detected'
                   : 'Insufficient hip rotation (20°)',
            recommendation: i === 15 ? 'Reduce shoulder abduction to <140°' 
                          : i === 45 ? 'Avoid excessive squatting'
                          : 'Engage hips and core for power'
          });
          feedback.push(
            i === 15 ? 'Contact point too high - reduce shoulder extension'
            : i === 45 ? 'Deep flexion detected - maintain athletic stance'
            : 'Improve hip rotation for power generation'
          );
          metrics.right_shoulder_abduction = i === 15 ? 145 : metrics.right_shoulder_abduction;
          metrics.right_knee_flexion = i === 45 ? 85 : metrics.right_knee_flexion;
          metrics.hip_rotation_deg = i === 130 ? 20 : metrics.hip_rotation_deg;
        } else if (i === 80) {
          injury_risk = 'medium';
          injury_risks.push({
            type: 'elbow_strain',
            severity: 'medium',
            angle: 75,
            message: 'Elbow angle (75°) outside optimal range',
            recommendation: 'Optimal elbow angle: 90-130°'
          });
          feedback.push('Adjust elbow position for better form');
          metrics.right_elbow_flexion = 75;
        }
        
        return {
          frameIdx: i,
          timestampSec: (r.timestampSec || r.metrics?.time_sec || i * 0.033),
          bbox: r.bbox || [100, 100, 300, 400],
          confidence: r.confidence || 0.95,
          track_id: 0,
          metrics,
          injury_risk,
          injury_risks,
          feedback
        };
      });

      const demoResult = {
        ...data,
        videoUrl: "/demo/annotated.mp4",
        stroke_type: "groundstroke",
        frames,
        summary: {
          total_frames: frames.length,
          analyzed_frames: frames.length,
          fps: 30,
          duration_sec: frames.length * 0.033,
          stroke_type: "groundstroke",
          overall_risk: "medium",
          risk_percentages: {
            shoulder_overuse: 2.5,
            poor_kinetic_chain: 1.5,
            knee_stress: 1.0
          }
        },
        llm_response: `## Overall Assessment

Your groundstroke technique shows solid fundamentals with good hip rotation and shoulder mechanics. There are a few areas where timing and form can be improved to reduce injury risk.

## Key Strengths

- Good baseline hip rotation for power generation
- Consistent follow-through motion
- Stable ready position between shots

## Priority Areas for Improvement

1. **Contact Point Height** - Keep paddle contact below waist level for legal shots
2. **Knee Stability** - Maintain athletic stance, avoid deep flexion during strokes
3. **Trunk Rotation** - Smooth out rotation to reduce strain

## Drill Recommendations

1. **Shadow Swings** - Practice full motion without ball, focus on smooth rotation
2. **Wall Drills** - Work on contact point consistency at waist height
3. **Balance Board** - Improve stability during weight transfer

## Injury Prevention Notes

Monitor shoulder abduction angle during aggressive shots. Consider dynamic stretching before play.`
      };

      // Store in session and navigate to player page
      sessionStorage.setItem('analysisResult', JSON.stringify(demoResult));
      router.push('/strikesense/player?stroke=groundstroke&demo=true');
    } catch (error) {
      console.error("Demo load failed:", error);
      alert("Could not load demo analysis.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b border-neutral-200">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-black flex items-center justify-center text-lg md:text-xl">
              🏓
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">StrikeSense</h1>
              <p className="text-[10px] md:text-xs text-neutral-500 hidden sm:block">AI Stroke Analysis</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs text-neutral-600">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            AI-Powered Biomechanics
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => router.push('/strikesense/history')}
            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-2 text-xs md:text-sm font-medium text-neutral-500 border border-neutral-200 rounded-full hover:bg-neutral-100 hover:text-black transition-all duration-300"
          >
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={handleDemo}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-black border border-neutral-300 rounded-full hover:bg-neutral-100 transition-all duration-300"
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
            <span className="block text-black">
              Pickleball Stroke
            </span>
          </h2>
          
          <p className="text-sm md:text-lg text-neutral-500 max-w-2xl mx-auto mb-6 md:mb-8 px-4">
            Upload a video and get instant feedback on your technique. 
            Track joint angles, detect form issues, and improve your game.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:justify-center sm:gap-6 md:gap-8 text-xs md:text-sm max-w-md sm:max-w-none mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-black">33</span>
              <span className="text-neutral-500 text-[10px] sm:text-xs md:text-sm">Body Points</span>
            </div>
            <div className="hidden sm:block w-px h-6 md:h-8 bg-neutral-200 flex-shrink-0" />
            <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-black">30</span>
              <span className="text-neutral-500 text-[10px] sm:text-xs md:text-sm">FPS Analysis</span>
            </div>
            <div className="hidden sm:block w-px h-6 md:h-8 bg-neutral-200 flex-shrink-0" />
            <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-black">Real-time</span>
              <span className="text-neutral-500 text-[10px] sm:text-xs md:text-sm">Feedback</span>
            </div>
          </div>
        </div>

        {/* Stroke Selection */}
        <div className="mb-8">
          <h3 className="text-center text-[10px] md:text-sm font-medium text-neutral-400 uppercase tracking-wider mb-6 md:mb-8">
            Select Your Stroke Type
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {STROKE_OPTIONS.map((stroke) => (
              <button
                key={stroke.id}
                onClick={() => handleStrokeSelect(stroke.id)}
                onMouseEnter={() => setHoveredStroke(stroke.id)}
                onMouseLeave={() => setHoveredStroke(null)}
                className={`
                  relative group p-4 md:p-6 rounded-2xl border border-neutral-200 
                  bg-neutral-50
                  hover:border-neutral-300 hover:bg-neutral-100
                  transition-all duration-300 ease-out
                  active:scale-[0.98] touch-manipulation
                  ${hoveredStroke === stroke.id ? 'scale-[1.02]' : ''}
                `}
              >
                {/* Icon */}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl mb-3 md:mb-4 flex items-center justify-center text-2xl md:text-3xl bg-black group-hover:scale-110 transition-transform duration-300">
                  {stroke.icon}
                </div>
                
                {/* Content */}
                <h4 className="text-base md:text-xl font-bold mb-1 md:mb-2 text-black text-left">
                  {stroke.title}
                </h4>
                <p className="text-xs md:text-sm text-neutral-500 mb-2 md:mb-4 line-clamp-2 text-left hidden sm:block">
                  {stroke.description}
                </p>
                
                {/* Stats tag */}
                <div className="text-[10px] md:text-xs text-neutral-400 font-medium text-left">
                  {stroke.stats}
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-4 md:top-6 right-4 md:right-6 w-7 h-7 md:w-8 md:h-8 rounded-full bg-neutral-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-black" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12 md:mt-20 text-center">
          <h3 className="text-[10px] md:text-sm font-medium text-neutral-400 uppercase tracking-wider mb-6 md:mb-8">
            How It Works
          </h3>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-16">
            {[
              { step: "1", title: "Upload Video", desc: "Record your stroke from any angle", icon: Target },
              { step: "2", title: "Select Player", desc: "Draw a box around yourself", icon: Zap },
              { step: "3", title: "Get Analysis", desc: "View biomechanics & feedback", icon: Shield },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black flex items-center justify-center text-base md:text-lg font-bold mb-2 md:mb-3 text-white">
                  {item.step}
                </div>
                <h4 className="font-semibold text-black mb-0.5 md:mb-1 text-sm md:text-base">{item.title}</h4>
                <p className="text-xs md:text-sm text-neutral-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-10 md:hidden">
          <button
            onClick={() => handleStrokeSelect('serve')}
            className="w-full py-4 bg-black text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-transform"
          >
            Start Analysis →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 md:py-8 border-t border-neutral-200 mt-8">
        <p className="text-xs md:text-sm text-neutral-400 px-4">
          © 2024 StrikeSense • AI-Powered Pickleball Analysis
        </p>
      </footer>
    </div>
  );
}
