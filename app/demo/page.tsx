"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, ArrowLeft, ArrowRight, Volume2, VolumeX } from "lucide-react";

/**
 * Demo Page - Shows video walkthrough of StrikeSense
 * 
 * Plays the demo video showing the complete app flow
 */
export default function DemoPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(prog);
        }
    };

    const handleVideoEnd = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-neutral-800">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-neutral-800 rounded-full text-[10px] font-medium text-neutral-400">
                        DEMO
                    </span>
                    <span className="text-sm font-medium text-white">StrikeSense Walkthrough</span>
                </div>
                <button
                    onClick={() => router.push('/strikesense/guide?stroke=serve')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white text-black rounded-full text-xs font-medium hover:bg-neutral-200 transition"
                >
                    Try Now <ArrowRight className="w-3 h-3" />
                </button>
            </header>

            {/* Video Container */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="relative w-full max-w-4xl aspect-video bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
                    <video
                        ref={videoRef}
                        src="/images/video.MP4"
                        className="w-full h-full object-contain"
                        muted={isMuted}
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnd}
                        onClick={togglePlay}
                    />

                    {/* Play/Pause Overlay */}
                    {!isPlaying && (
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                            onClick={togglePlay}
                        >
                            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform">
                                <Play className="w-10 h-10 text-black ml-1" />
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-700">
                        <div
                            className="h-full bg-white transition-all duration-100"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                        <button
                            onClick={toggleMute}
                            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
                        >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Caption */}
            <div className="text-center pb-8 px-4">
                <p className="text-neutral-400 text-sm mb-4">
                    See how StrikeSense analyzes your pickleball technique
                </p>
                <button
                    onClick={() => router.push('/strikesense/guide?stroke=serve')}
                    className="px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 transition"
                >
                    Start Your Own Analysis →
                </button>
            </div>
        </div>
    );
}
