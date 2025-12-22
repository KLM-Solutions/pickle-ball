"use client";

import React, { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, ArrowLeft, Activity, Target } from "lucide-react";

import { saveVideoFile } from "../../../lib/videoStorage";

export const dynamic = 'force-dynamic';

function UploadContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const strokeType = searchParams.get('stroke') || 'serve';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (file: File) => {
        if (file && file.type.startsWith('video/')) {
            try {
                setIsUploading(true);
                await saveVideoFile(file);
                sessionStorage.setItem('videoFileName', file.name);
                sessionStorage.setItem('strokeType', strokeType);
                router.push(`/strikesense/crop?stroke=${strokeType}`);
            } catch (error) {
                console.error('Failed to save video:', error);
                alert('Failed to upload video. Please try again.');
            } finally {
                setIsUploading(false);
            }
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
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {/* Fixed Header */}
            <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0 shadow-sm">
                <button
                    onClick={() => router.push(`/strikesense/guide?stroke=${strokeType}`)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition touch-target"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="text-xs font-semibold text-[#00BFA5] uppercase tracking-wider">Upload Video</div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center px-4 py-6">
                {/* Upload Drop Zone - Centered */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={() => setIsDragging(false)}
                    className={`border-4 border-dashed rounded-2xl p-8 text-center transition cursor-pointer bg-white ${isDragging
                        ? 'border-[#00BFA5] bg-[#00BFA5]/5 scale-105'
                        : 'border-gray-300 hover:border-[#00BFA5]'
                        }`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className={`w-16 h-16 mx-auto mb-4 transition ${isDragging ? 'text-[#00BFA5] scale-110' : 'text-gray-400 animate-bounce'
                        }`} />

                    <h2 className="text-2xl font-bold mb-2 text-[#1A237E]">Upload Your Match</h2>
                    <p className="text-sm text-gray-600 mb-6">
                        {isDragging ? 'Drop your video here' : 'Drag and drop or click to select a video'}
                    </p>

                    {/* Format Badges - Compact */}
                    <div className="flex gap-3 justify-center mb-6">
                        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">MP4</span>
                        <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">MOV</span>
                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">AVI</span>
                    </div>

                    <button
                        disabled={isUploading}
                        className="bg-[#00BFA5] hover:bg-[#00A890] text-white px-8 py-3 rounded-lg font-medium transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                    >
                        {isUploading ? 'Uploading...' : 'Select Video File'}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                        }}
                        className="hidden"
                    />
                </div>

                {/* Info Cards - Compact Horizontal */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white rounded-xl p-4 border-2 border-[#00BFA5] shadow-sm hover:shadow-md transition">
                        <div className="w-12 h-12 bg-[#00BFA5] rounded-xl flex items-center justify-center mb-3">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-sm mb-1 text-[#1A237E]">Real-time Analysis</h3>
                        <p className="text-xs text-gray-600">Instant feedback</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border-2 border-purple-500 shadow-sm hover:shadow-md transition">
                        <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-3">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-sm mb-1 text-[#1A237E]">Auto Tracking</h3>
                        <p className="text-xs text-gray-600">AI powered</p>
                    </div>
                </div>
            </div>

            {/* Safe area padding for mobile */}
            <div className="pb-safe"></div>
        </div>
    );
}

export default function UploadPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-400">Loading upload...</div>
            </div>
        }>
            <UploadContent />
        </Suspense>
    );
}
