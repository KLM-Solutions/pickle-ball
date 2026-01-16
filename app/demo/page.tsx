"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, X } from "lucide-react";

/**
 * Demo Page - Fullscreen video walkthrough
 * 
 * Clean, immersive video player for the demo
 * Plays at normal speed, muted by default
 */
export default function DemoPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showControls, setShowControls] = useState(true);

    useEffect(() => {
        // Set normal playback speed when video loads
        if (videoRef.current) {
            videoRef.current.playbackRate = 1.0;
        }
    }, []);

    useEffect(() => {
        // Auto-hide controls after 3 seconds
        let timeout: NodeJS.Timeout;
        if (isPlaying && showControls) {
            timeout = setTimeout(() => setShowControls(false), 3000);
        }
        return () => clearTimeout(timeout);
    }, [isPlaying, showControls]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.playbackRate = 1.0; // Ensure normal speed
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
        setShowControls(true);
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
        setShowControls(true);
    };

    const handleClose = () => {
        router.push('/');
    };

    const handleTryNow = () => {
        router.push('/strikesense/guide?stroke=serve');
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black flex flex-col"
            onClick={() => setShowControls(true)}
        >
            {/* Close Button - Always visible */}
            <button
                onClick={handleClose}
                className="absolute top-4 left-4 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white/80 hover:text-white transition"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Demo Badge + Speed indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                <span className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-white/80">
                    Demo Walkthrough
                </span>
                <span className="px-2 py-1 bg-white/20 rounded-full text-[10px] font-bold text-white">
                    1x
                </span>
            </div>

            {/* Video Container - Fullscreen */}
            <div className="flex-1 flex items-center justify-center w-full px-0">
                <video
                    ref={videoRef}
                    src="https://tnfqqcjstysyuqajfoqr.supabase.co/storage/v1/object/public/videos/Untitled%20video%20-%20Made%20with%20Clipchamp%20(16).mp4"
                    className="w-auto h-[75vh] min-h-[400px]"
                    muted
                    playsInline
                    disablePictureInPicture
                    controlsList="nodownload nofullscreen noremoteplayback"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnd}
                    onClick={togglePlay}
                />

                {/* Play Button Overlay */}
                {!isPlaying && (
                    <div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                        onClick={togglePlay}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform shadow-2xl">
                                <Play className="w-10 h-10 sm:w-12 sm:h-12 text-black ml-1" />
                            </div>
                            <p className="text-white/70 text-sm font-medium">Tap to play</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls - Fade in/out */}
            <div
                className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                {/* Progress Bar */}
                <div className="h-1 bg-white/20">
                    <div
                        className="h-full bg-white transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Controls Bar */}
                <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-t from-black/80 to-transparent">
                    {/* Left Controls */}
                    <button
                        onClick={togglePlay}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>

                    {/* CTA Button */}
                    <button
                        onClick={handleTryNow}
                        className="px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-neutral-200 transition"
                    >
                        Try It Yourself →
                    </button>
                </div>
            </div>
        </div>
    );
}
