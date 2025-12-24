"use client";

import React, { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, ArrowLeft, Cloud, Zap, Loader2, Film, Shield, ChevronRight } from "lucide-react";

import { uploadVideo } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

const strokeConfig: Record<string, any> = {
    serve: { icon: '🎾', gradient: 'from-emerald-500 to-teal-600', shadowColor: 'shadow-emerald-500/30' },
    groundstroke: { icon: '💪', gradient: 'from-orange-500 to-red-500', shadowColor: 'shadow-orange-500/30' },
    dink: { icon: '🤏', gradient: 'from-violet-500 to-purple-600', shadowColor: 'shadow-violet-500/30' },
    overhead: { icon: '⚡', gradient: 'from-blue-500 to-indigo-600', shadowColor: 'shadow-blue-500/30' },
};

function UploadContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const config = strokeConfig[strokeType] || strokeConfig.serve;
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileSelect = async (file: File) => {
        if (!file || !file.type.startsWith('video/')) {
            setError('Please select a valid video file');
            return;
        }

        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('Video file is too large. Maximum size is 500MB.');
            return;
        }

        try {
            setIsUploading(true);
            setFileName(file.name);
            setError(null);
            setUploadProgress(10);

            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 80));
            }, 500);

            const videoUrl = await uploadVideo(file);

            clearInterval(progressInterval);
            setUploadProgress(100);

            sessionStorage.setItem('videoUrl', videoUrl);
            sessionStorage.setItem('videoFileName', file.name);
            sessionStorage.setItem('strokeType', strokeType);

            setTimeout(() => {
                router.push(`/strikesense/crop?stroke=${strokeType}`);
            }, 500);

        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.message || 'Failed to upload video. Please try again.');
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/3 -right-10 md:-right-20 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-br ${config.gradient} rounded-full filter blur-[100px] md:blur-[150px] opacity-20 animate-pulse`} />
                <div className="absolute bottom-1/3 -left-10 md:-left-20 w-48 md:w-80 h-48 md:h-80 bg-cyan-500 rounded-full filter blur-[100px] md:blur-[150px] opacity-15 animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <header className="relative z-10 px-4 py-3 md:py-4">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.push(`/strikesense/guide?stroke=${strokeType}`)}
                        className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition p-1"
                    >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="text-xs md:text-sm font-medium">Back</span>
                    </button>
                    <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-500">
                        Step 2 of 3
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 px-4 pb-6 md:pb-8">
                <div className="max-w-lg mx-auto">
                    
                    {/* Hero */}
                    <div className="text-center pt-2 md:pt-4 pb-6 md:pb-8">
                        <div className={`inline-flex w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br ${config.gradient} items-center justify-center text-3xl md:text-4xl mb-4 md:mb-5 shadow-xl ${config.shadowColor}`}>
                            {config.icon}
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold mb-1.5 md:mb-2">Upload Your Video</h1>
                        <p className="text-slate-400 text-sm md:text-base">Select a video of your stroke to analyze</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl md:rounded-2xl text-xs md:text-sm flex items-start gap-2 md:gap-3">
                            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[10px] md:text-xs">!</span>
                            </div>
                            {error}
                        </div>
                    )}

                    {/* Upload Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`
                            relative rounded-2xl md:rounded-3xl p-6 md:p-8 text-center cursor-pointer transition-all duration-300
                            ${isDragging 
                                ? `bg-gradient-to-br ${config.gradient} scale-[1.02]` 
                                : 'bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-white/40'
                            }
                            ${isUploading ? 'pointer-events-none' : ''}
                            active:scale-[0.98] touch-manipulation
                        `}
                    >
                        {isUploading ? (
                            <div className="py-4 md:py-6">
                                {/* Progress Ring - Using viewBox for responsive scaling */}
                                <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-5 md:mb-6">
                                    <svg 
                                        className="w-full h-full transform -rotate-90"
                                        viewBox="0 0 100 100"
                                    >
                                        {/* Background circle */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="42"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="none"
                                            className="text-white/10"
                                        />
                                        {/* Progress circle */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="42"
                                            stroke="url(#uploadGradient)"
                                            strokeWidth="8"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeDasharray={264}
                                            strokeDashoffset={264 - (264 * uploadProgress) / 100}
                                            className="transition-all duration-500 ease-out"
                                        />
                                        <defs>
                                            <linearGradient id="uploadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="100%" stopColor="#14b8a6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    {/* Percentage text overlay */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-400">
                                            {uploadProgress}
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-emerald-400/70 font-medium -mt-1">
                                            percent
                                        </span>
                                    </div>
                                </div>
                                
                                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">Uploading...</h3>
                                <p className="text-slate-400 text-xs sm:text-sm mb-2 truncate max-w-[220px] sm:max-w-[280px] mx-auto px-2">{fileName}</p>
                                <p className="text-slate-500 text-[10px] sm:text-xs">Securely uploading to cloud</p>
                            </div>
                        ) : (
                            <>
                                <div className={`
                                    w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-xl md:rounded-2xl flex items-center justify-center
                                    ${isDragging 
                                        ? 'bg-white/30' 
                                        : `bg-gradient-to-br ${config.gradient} shadow-xl ${config.shadowColor}`
                                    }
                                    transition-all duration-300
                                `}>
                                    <Upload className="w-8 h-8 md:w-10 md:h-10 text-white" />
                                </div>

                                <h3 className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
                                    {isDragging ? 'Drop it here!' : 'Tap to Upload'}
                                </h3>
                                <p className="text-slate-400 mb-4 md:mb-6 text-sm">
                                    {isDragging ? 'Release to upload' : 'or drag & drop a file'}
                                </p>

                                <div className="flex gap-1.5 md:gap-2 justify-center flex-wrap">
                                    {['MP4', 'MOV', 'AVI', 'WEBM'].map((format) => (
                                        <span key={format} className="px-2.5 md:px-3 py-1 bg-white/10 rounded-full text-[10px] md:text-xs font-medium text-slate-300">
                                            {format}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                            className="hidden"
                            disabled={isUploading}
                        />
                    </div>

                    {/* Features */}
                    {!isUploading && (
                        <div className="grid grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-6">
                            {[
                                { icon: Cloud, label: 'Cloud Upload', desc: 'Fast & secure' },
                                { icon: Zap, label: 'GPU Analysis', desc: 'AI-powered' },
                                { icon: Shield, label: 'Private', desc: 'Your data safe' },
                            ].map((feature, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-center backdrop-blur-sm">
                                    <feature.icon className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5 md:mb-2 text-emerald-400" />
                                    <div className="text-[10px] md:text-xs font-bold text-white mb-0.5">{feature.label}</div>
                                    <div className="text-[9px] md:text-[10px] text-slate-500">{feature.desc}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* File Info */}
                    {!isUploading && (
                        <div className="mt-4 md:mt-6 flex items-center justify-center gap-2 md:gap-4 text-[10px] md:text-xs text-slate-500 flex-wrap">
                            <div className="flex items-center gap-1">
                                <Film className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span>Max 500MB</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                                <span>Best: 30 FPS</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                                <span>3-60 seconds</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function UploadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-emerald-400 font-bold animate-pulse">Loading...</div>
            </div>
        }>
            <UploadContent />
        </Suspense>
    );
}
