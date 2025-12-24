"use client";

import React, { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, ArrowLeft, Cloud, Cpu, Loader2 } from "lucide-react";

import { uploadVideo } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

function UploadContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

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
            setError(null);
            setUploadProgress(10);

            console.log('Uploading to Supabase:', file.name);
            setUploadProgress(30);

            const videoUrl = await uploadVideo(file);

            setUploadProgress(90);
            console.log('Video uploaded:', videoUrl);

            sessionStorage.setItem('videoUrl', videoUrl);
            sessionStorage.setItem('videoFileName', file.name);
            sessionStorage.setItem('strokeType', strokeType);

            setUploadProgress(100);
            router.push(`/strikesense/crop?stroke=${strokeType}`);

        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.message || 'Failed to upload video. Please try again.');
        } finally {
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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
            {/* Animated background */}
            <div className="fixed inset-0 opacity-20">
                <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-500 rounded-full filter blur-[128px] animate-pulse" />
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500 rounded-full filter blur-[128px] animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <header className="relative z-10 h-16 flex items-center justify-between px-4 border-b border-white/10 backdrop-blur-sm">
                <button
                    onClick={() => router.push(`/strikesense/guide?stroke=${strokeType}`)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="text-xs font-bold tracking-widest uppercase text-emerald-400">Upload Video</div>
                <div className="w-16" />
            </header>

            {/* Main Content */}
            <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 flex flex-col justify-center min-h-[calc(100vh-64px)]">
                
                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl text-sm backdrop-blur-sm">
                        {error}
                    </div>
                )}

                {/* Upload Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={() => setIsDragging(false)}
                    className={`
                        relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
                        bg-white/5 backdrop-blur-sm
                        ${isDragging ? 'border-emerald-400 bg-emerald-500/10 scale-[1.02]' : 'border-white/20 hover:border-emerald-400/50'}
                        ${isUploading ? 'pointer-events-none' : ''}
                    `}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                    {isUploading ? (
                        <div className="py-8">
                            <Loader2 className="w-16 h-16 mx-auto mb-4 text-emerald-400 animate-spin" />
                            <h2 className="text-2xl font-bold mb-2">Uploading...</h2>
                            <p className="text-sm text-slate-400 mb-6">
                                Uploading your video to the cloud
                            </p>
                            {/* Progress Bar */}
                            <div className="w-full max-w-xs mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="mt-3 text-sm text-emerald-400 font-bold">{uploadProgress}%</p>
                        </div>
                    ) : (
                        <>
                            <div className={`
                                w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center
                                bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30
                                ${isDragging ? 'scale-110' : 'animate-bounce'}
                                transition-transform
                            `}>
                                <Upload className="w-10 h-10 text-white" />
                            </div>

                            <h2 className="text-2xl font-bold mb-2">Upload Your Video</h2>
                            <p className="text-slate-400 mb-8">
                                {isDragging ? 'Drop your video here' : 'Drag and drop or click to select'}
                            </p>

                            {/* Format Badges */}
                            <div className="flex gap-3 justify-center mb-8">
                                <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium border border-blue-500/30">MP4</span>
                                <span className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium border border-purple-500/30">MOV</span>
                                <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">AVI</span>
                            </div>

                            <button
                                disabled={isUploading}
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                            >
                                Select Video File
                            </button>

                            <p className="mt-6 text-xs text-slate-500">Max file size: 500MB</p>
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

                {/* Info Cards */}
                {!isUploading && (
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm hover:bg-white/10 transition">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-3 shadow-lg">
                                <Cloud className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-bold text-sm mb-1">Cloud Storage</h3>
                            <p className="text-xs text-slate-400">Secure upload to Supabase</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm hover:bg-white/10 transition">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 shadow-lg">
                                <Cpu className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-bold text-sm mb-1">GPU Processing</h3>
                            <p className="text-xs text-slate-400">AI-powered analysis</p>
                        </div>
                    </div>
                )}
            </div>
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
