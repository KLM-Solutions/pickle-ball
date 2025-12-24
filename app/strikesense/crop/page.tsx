"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, User, Grid3x3, Play, Maximize2, ZoomIn, ZoomOut, RotateCcw, Upload } from 'lucide-react';

function CropContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strokeType = searchParams.get('stroke') || 'overall';

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  const [cropBox, setCropBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [activeAction, setActiveAction] = useState<'drawing' | 'moving' | 'resizing' | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const storedUrl = sessionStorage.getItem('videoUrl');
    if (storedUrl) {
      setVideoUrl(storedUrl);
    }
  }, []);

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setVideoDimensions({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  const screenToNormalized = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || !videoRef.current) return { x: 0, y: 0 };
    const containerRect = containerRef.current.getBoundingClientRect();
    const video = videoRef.current;
    const containerRatio = containerRect.width / containerRect.height;
    const videoRatio = video.videoWidth / video.videoHeight;

    let displayWidth = containerRect.width;
    let displayHeight = containerRect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (videoRatio > containerRatio) {
      displayHeight = containerRect.width / videoRatio;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      displayWidth = containerRect.height * videoRatio;
      offsetX = (containerRect.width - displayWidth) / 2;
    }

    const x = Math.max(0, Math.min(100, ((clientX - (containerRect.left + offsetX)) / displayWidth) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - (containerRect.top + offsetY)) / displayHeight) * 100));
    return { x, y };
  }, []);

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent, action: 'drawing' | 'moving' | 'resizing' = 'drawing', handle: string | null = null) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = screenToNormalized(clientX, clientY);

    setActiveAction(action);
    setActiveHandle(handle);

    if (action === 'drawing') {
      setDrawStart({ x, y });
      setCropBox({ x, y, width: 0.1, height: 0.1 });
    } else if (action === 'moving' && cropBox) {
      setOffset({ x: x - cropBox.x, y: y - cropBox.y });
    }
  };

  const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!activeAction) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = screenToNormalized(clientX, clientY);

    setCropBox(prev => {
      if (!prev) return null;
      if (activeAction === 'drawing') {
        return {
          x: Math.min(x, drawStart.x),
          y: Math.min(y, drawStart.y),
          width: Math.abs(x - drawStart.x),
          height: Math.abs(y - drawStart.y)
        };
      }
      if (activeAction === 'moving') {
        return {
          ...prev,
          x: Math.max(0, Math.min(100 - prev.width, x - offset.x)),
          y: Math.max(0, Math.min(100 - prev.height, y - offset.y))
        };
      }
      if (activeAction === 'resizing' && activeHandle) {
        let newX = prev.x, newY = prev.y, newW = prev.width, newH = prev.height;
        if (activeHandle.includes('left')) {
          newX = Math.max(0, Math.min(prev.x + prev.width - 2, x));
          newW = prev.x + prev.width - newX;
        } else if (activeHandle.includes('right')) {
          newW = Math.max(2, Math.min(100 - prev.x, x - prev.x));
        }
        if (activeHandle.includes('top')) {
          newY = Math.max(0, Math.min(prev.y + prev.height - 2, y));
          newH = prev.y + prev.height - newY;
        } else if (activeHandle.includes('bottom')) {
          newH = Math.max(2, Math.min(100 - prev.y, y - prev.y));
        }
        return { x: newX, y: newY, width: newW, height: newH };
      }
      return prev;
    });
  }, [activeAction, activeHandle, drawStart, offset, screenToNormalized]);

  const handleInteractionEnd = useCallback(() => {
    setActiveAction(null);
    setActiveHandle(null);
    setCropBox(prev => (prev && (prev.width < 1 || prev.height < 1)) ? null : prev);
  }, []);

  useEffect(() => {
    if (activeAction) {
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchmove', handleInteractionMove);
      window.addEventListener('touchend', handleInteractionEnd);
      return () => {
        window.removeEventListener('mousemove', handleInteractionMove);
        window.removeEventListener('mouseup', handleInteractionEnd);
        window.removeEventListener('touchmove', handleInteractionMove);
        window.removeEventListener('touchend', handleInteractionEnd);
      };
    }
  }, [activeAction, handleInteractionMove, handleInteractionEnd]);

  const applyPreset = (preset: 'full' | 'center' | 'left' | 'right') => {
    switch (preset) {
      case 'full': setCropBox({ x: 5, y: 5, width: 90, height: 90 }); break;
      case 'center': setCropBox({ x: 25, y: 15, width: 50, height: 70 }); break;
      case 'left': setCropBox({ x: 15, y: 15, width: 35, height: 70 }); break;
      case 'right': setCropBox({ x: 50, y: 15, width: 35, height: 70 }); break;
    }
  };

  const resetCrop = () => { setCropBox(null); setZoom(1); };

  const handleStartAnalysis = () => {
    if (!cropBox) return;
    const x1 = cropBox.x / 100;
    const y1 = cropBox.y / 100;
    const x2 = (cropBox.x + cropBox.width) / 100;
    const y2 = (cropBox.y + cropBox.height) / 100;

    const coords = { x1, y1, x2, y2 };
    sessionStorage.setItem('cropCoords', JSON.stringify(coords));

    router.push(`/strikesense/processing?stroke=${strokeType}`);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500 rounded-full filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500 rounded-full filter blur-[128px] animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="relative z-50 h-16 flex items-center justify-between px-4 border-b border-white/10 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={() => router.push(`/strikesense/upload?stroke=${strokeType}`)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold tracking-widest uppercase text-slate-400">Select Player</span>
        </div>
        <button 
          onClick={() => setShowGrid(!showGrid)} 
          className={`p-2 rounded-lg transition-all ${showGrid ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white'}`}
        >
          <Grid3x3 className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Workspace Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
          <div 
            ref={containerRef} 
            className="relative w-full h-full flex items-center justify-center cursor-crosshair bg-black/30 rounded-2xl overflow-hidden border border-white/10"
            onMouseDown={(e) => handleInteractionStart(e, 'drawing')}
            onTouchStart={(e) => handleInteractionStart(e, 'drawing')}
            style={{ transform: `scale(${zoom})`, transition: activeAction ? 'none' : 'transform 0.2s ease-out' }}
          >

            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-w-full max-h-full object-contain pointer-events-none"
                onLoadedMetadata={handleVideoLoad}
                preload="metadata"
                playsInline
                muted
                crossOrigin="anonymous"
              />
            ) : (
              <div className="text-center p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-white uppercase tracking-tight mb-2">No Video Loaded</p>
                <button
                  onClick={() => router.push(`/strikesense/upload?stroke=${strokeType}`)}
                  className="text-sm text-emerald-400 hover:underline"
                >
                  Upload a video
                </button>
              </div>
            )}

            {videoUrl && cropBox && (
              <div className="absolute inset-0 pointer-events-none">
                <div 
                  className="absolute inset-0 bg-black/60" 
                  style={{ clipPath: `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${cropBox.x}% ${cropBox.y}%, ${cropBox.x}% ${cropBox.y + cropBox.height}%, ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%, ${cropBox.x + cropBox.width}% ${cropBox.y}%, ${cropBox.x}% ${cropBox.y}%)` }} 
                />
                <div 
                  className="absolute border-2 border-emerald-400 pointer-events-auto bg-emerald-500/10 shadow-lg shadow-emerald-500/20 flex items-center justify-center"
                  onMouseDown={(e) => handleInteractionStart(e, 'moving')}
                  onTouchStart={(e) => handleInteractionStart(e, 'moving')}
                  style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.width}%`, height: `${cropBox.height}%` }}
                >

                  {/* Resizing Handles */}
                  {[
                    { id: 'top-left', class: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
                    { id: 'top-right', class: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
                    { id: 'bottom-left', class: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
                    { id: 'bottom-right', class: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
                    { id: 'top', class: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
                    { id: 'bottom', class: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
                    { id: 'left', class: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
                    { id: 'right', class: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
                  ].map(h => (
                    <div 
                      key={h.id} 
                      className={`absolute w-6 h-6 flex items-center justify-center z-10 ${h.class}`}
                      onMouseDown={(e) => handleInteractionStart(e, 'resizing', h.id)}
                      onTouchStart={(e) => handleInteractionStart(e, 'resizing', h.id)}
                    >
                      <div className="w-3 h-3 bg-white border-2 border-emerald-400 rounded-full shadow-lg" />
                    </div>
                  ))}

                  {/* Grid Overlay */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-emerald-400" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-emerald-400" />
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-emerald-400" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-emerald-400" />
                    </div>
                  )}

                  {/* Label */}
                  <div className="absolute -top-8 left-0 bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Target Player
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Zoom Controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
            <button onClick={() => setZoom(Math.min(2, zoom + 0.25))} className="w-10 h-10 bg-white/10 border border-white/20 text-white rounded-xl flex items-center justify-center backdrop-blur-sm hover:bg-white/20 active:scale-95 transition-all">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="w-10 h-10 bg-white/10 border border-white/20 text-white rounded-xl flex items-center justify-center backdrop-blur-sm hover:bg-white/20 active:scale-95 transition-all">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={resetCrop} className="w-10 h-10 bg-white/10 border border-white/20 text-white rounded-xl flex items-center justify-center backdrop-blur-sm hover:bg-white/20 active:scale-95 transition-all">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Control Panel */}
        <div className="bg-slate-900/80 border-t border-white/10 px-4 py-5 flex-shrink-0 z-50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4">

            {/* Quick Presets */}
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Quick Zones</span>
                {cropBox && <span className="text-[10px] font-bold text-emerald-400">{Math.round(cropBox.width)}% x {Math.round(cropBox.height)}%</span>}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'left', label: 'Left', icon: <div className="w-1.5 h-3 border-l-2 border-current" /> },
                  { id: 'center', label: 'Center', icon: <div className="w-3 h-3 border-x-2 border-current" /> },
                  { id: 'right', label: 'Right', icon: <div className="w-1.5 h-3 border-r-2 border-current" /> },
                  { id: 'full', label: 'Full', icon: <Maximize2 className="w-3 h-3" /> }
                ].map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => applyPreset(p.id as any)}
                    className="bg-white/5 border border-white/10 hover:border-emerald-400/50 hover:bg-white/10 text-white py-3 rounded-xl transition-all flex flex-col items-center gap-1.5 active:scale-95"
                  >
                    <div className="text-emerald-400">{p.icon}</div>
                    <span className="text-[9px] font-bold uppercase tracking-tight text-slate-400">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden md:block w-px h-16 bg-white/10 mx-2" />

            {/* CTA */}
            <div className="flex flex-col gap-2 w-full md:w-64">
              <button 
                onClick={handleStartAnalysis} 
                disabled={!videoUrl || !cropBox}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Analyze
              </button>
              {!cropBox && (
                <p className="text-[10px] text-center text-slate-500 font-medium animate-pulse">
                  Draw a box around the player to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CropPage() {
  return (
    <React.Suspense fallback={
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 font-bold animate-pulse">Loading...</div>
      </div>
    }>
      <CropContent />
    </React.Suspense>
  );
}
