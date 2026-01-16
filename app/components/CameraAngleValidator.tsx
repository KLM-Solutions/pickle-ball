"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, ChevronRight, Camera, X } from 'lucide-react';
import { validateCameraAngle, ValidationResult, StrokeType } from '@/lib/analysis/cameraValidation';

interface CameraAngleValidatorProps {
    videoFile: File | null;
    videoUrl?: string;
    strokeType: StrokeType;
    onValidationComplete: (result: ValidationResult, proceed: boolean) => void;
    onCancel?: () => void;
}

export default function CameraAngleValidator({
    videoFile,
    videoUrl,
    strokeType,
    onValidationComplete,
    onCancel,
}: CameraAngleValidatorProps) {
    const [status, setStatus] = useState<'loading' | 'passed' | 'failed' | 'error'>('loading');
    const [result, setResult] = useState<ValidationResult | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!videoFile && !videoUrl) return;

        const runValidation = async () => {
            setStatus('loading');
            setProgress(0);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 15, 90));
            }, 200);

            try {
                const validationResult = await validateCameraAngle(
                    videoFile || videoUrl!,
                    strokeType
                );

                clearInterval(progressInterval);
                setProgress(100);
                setResult(validationResult);
                setStatus(validationResult.passed ? 'passed' : 'failed');
            } catch (error) {
                clearInterval(progressInterval);
                console.error('Validation failed:', error);
                setStatus('error');
                setResult({
                    score: 0,
                    passed: false,
                    threshold: 65,
                    issues: [{ type: 'visibility', severity: 'high', message: 'Validation failed' }],
                    suggestion: 'Could not analyze video. You can continue anyway.',
                    framesSampled: 0,
                    analysisTimeMs: 0,
                });
            }
        };

        runValidation();
    }, [videoFile, videoUrl, strokeType]);

    const handleContinue = (proceed: boolean) => {
        if (result) {
            onValidationComplete(result, proceed);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-lg">
            {/* Header */}
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-neutral-500" />
                    <span className="text-sm font-semibold text-neutral-700">Camera Angle Check</span>
                </div>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-neutral-200 rounded-full transition"
                    >
                        <X className="w-4 h-4 text-neutral-400" />
                    </button>
                )}
            </div>

            <div className="p-4">
                {/* Loading State */}
                {status === 'loading' && (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 mx-auto mb-4 relative">
                            <RefreshCw className="w-16 h-16 text-blue-500 animate-spin" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-800 mb-2">Analyzing Camera Angle...</h3>
                        <p className="text-sm text-neutral-500 mb-4">Checking first 10 seconds of video</p>

                        {/* Progress bar */}
                        <div className="w-full bg-neutral-200 rounded-full h-2 mb-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-neutral-400">{progress}% complete</p>
                    </div>
                )}

                {/* Passed State */}
                {status === 'passed' && result && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-green-700 mb-1">Perfect Angle! ✓</h3>
                        <p className="text-sm text-neutral-500 mb-4">
                            Score: <span className="font-bold text-green-600">{result.score}</span>/100
                            <span className="text-neutral-400 ml-2">(Threshold: {result.threshold})</span>
                        </p>

                        {/* Minor suggestions if any */}
                        {result.issues.length > 0 && result.issues[0].severity !== 'high' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-left">
                                <p className="text-xs font-semibold text-green-700 uppercase mb-1">Tip</p>
                                <p className="text-sm text-green-600">{result.issues[0].correction || result.issues[0].message}</p>
                            </div>
                        )}

                        <button
                            onClick={() => handleContinue(true)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
                        >
                            Continue to Upload
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Failed State */}
                {status === 'failed' && result && (
                    <div className="py-4">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-amber-700 mb-1">Angle Needs Adjustment</h3>
                            <p className="text-sm text-neutral-500">
                                Score: <span className="font-bold text-amber-600">{result.score}</span>/100
                                <span className="text-neutral-400 ml-2">(Threshold: {result.threshold})</span>
                            </p>
                        </div>

                        {/* Correction suggestion */}
                        {result.suggestion && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                                <p className="text-xs font-semibold text-blue-700 uppercase mb-1.5">💡 Suggestion</p>
                                <p className="text-sm text-blue-800 font-medium">{result.suggestion}</p>
                            </div>
                        )}

                        {/* All issues */}
                        {result.issues.length > 1 && (
                            <div className="space-y-2 mb-4">
                                <p className="text-xs font-semibold text-neutral-500 uppercase">Issues Found</p>
                                {result.issues.slice(0, 3).map((issue, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-2.5 rounded-lg border text-xs ${issue.severity === 'high'
                                                ? 'bg-red-50 border-red-200 text-red-700'
                                                : issue.severity === 'medium'
                                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                    : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                                            }`}
                                    >
                                        {issue.message}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="space-y-2">
                            <button
                                onClick={() => onCancel?.()}
                                className="w-full bg-black hover:bg-neutral-800 text-white py-3 rounded-xl font-semibold text-sm transition"
                            >
                                Re-record Video
                            </button>
                            <button
                                onClick={() => handleContinue(true)}
                                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
                            >
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                Continue Anyway
                            </button>
                            <p className="text-[10px] text-neutral-400 text-center">
                                Analysis may be less accurate with suboptimal angles
                            </p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-700 mb-1">Could Not Analyze</h3>
                        <p className="text-sm text-neutral-500 mb-4">
                            Video analysis failed. You can still continue.
                        </p>
                        <button
                            onClick={() => handleContinue(true)}
                            className="w-full bg-black hover:bg-neutral-800 text-white py-3 rounded-xl font-semibold text-sm transition"
                        >
                            Continue Anyway
                        </button>
                    </div>
                )}

                {/* Stats footer */}
                {result && status !== 'loading' && (
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-center gap-4 text-[10px] text-neutral-400">
                        <span>Frames analyzed: {result.framesSampled}</span>
                        <span>•</span>
                        <span>Time: {result.analysisTimeMs}ms</span>
                    </div>
                )}
            </div>
        </div>
    );
}
