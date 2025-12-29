"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  Calendar,
  Timer,
  BarChart3,
  RefreshCw,
  Plus,
} from "lucide-react";
import { getAllAnalyses, formatDate, getStrokeInfo, AnalysisJob } from "@/lib/supabase-db";

export default function HistoryPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllAnalyses(50);
      setAnalyses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleViewAnalysis = (job: AnalysisJob) => {
    if (job.result_json) {
      const analysisResult = {
        ...job.result_json,
        videoUrl: job.result_video_url,
        stroke_type: job.stroke_type,
        llm_response: job.llm_response, // Include cached LLM response
      };
      sessionStorage.setItem("analysisResult", JSON.stringify(analysisResult));
      router.push(`/strikesense/player?stroke=${job.stroke_type}&job_id=${job.id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-black text-white rounded-full text-[10px] md:text-xs font-bold">
            <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3" /> 
            <span className="hidden sm:inline">Completed</span>
            <span className="sm:hidden">Done</span>
          </span>
        );
      case "processing":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-neutral-200 text-neutral-700 rounded-full text-[10px] md:text-xs font-bold">
            <Loader2 className="w-2.5 h-2.5 md:w-3 md:h-3 animate-spin" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-neutral-200 text-neutral-500 rounded-full text-[10px] md:text-xs font-bold">
            <XCircle className="w-2.5 h-2.5 md:w-3 md:h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-neutral-200 text-neutral-500 rounded-full text-[10px] md:text-xs font-bold">
            <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="relative z-20 border-b border-neutral-200 sticky top-0 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 md:gap-2 text-neutral-500 hover:text-black transition p-1"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm font-medium hidden sm:inline">Home</span>
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-black flex items-center justify-center">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold">History</h1>
                <p className="text-[10px] md:text-xs text-neutral-500">{analyses.length} analyses</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200 transition text-xs md:text-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-2 bg-black text-white rounded-lg text-xs md:text-sm font-bold"
            >
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 md:py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 md:py-20">
            <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-black animate-spin mb-4" />
            <p className="text-neutral-500 text-sm md:text-base">Loading history...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16 md:py-20">
            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
              <XCircle className="w-7 h-7 md:w-8 md:h-8 text-neutral-500" />
            </div>
            <h2 className="text-lg md:text-xl font-bold mb-2">Failed to Load</h2>
            <p className="text-neutral-500 mb-6 text-sm md:text-base px-4">{error}</p>
            <button
              onClick={fetchHistory}
              className="px-5 md:px-6 py-2.5 md:py-3 bg-black text-white rounded-xl font-bold text-sm md:text-base"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && analyses.length === 0 && (
          <div className="text-center py-16 md:py-20">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 md:mb-6 bg-neutral-100 rounded-full flex items-center justify-center border border-neutral-200">
              <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-neutral-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">No Analyses Yet</h2>
            <p className="text-neutral-500 mb-6 text-sm md:text-base px-4">
              Complete your first stroke analysis to see it here
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-5 md:px-6 py-2.5 md:py-3 bg-black text-white rounded-xl font-bold text-sm md:text-base"
            >
              Start New Analysis
            </button>
          </div>
        )}

        {/* Analysis List */}
        {!loading && !error && analyses.length > 0 && (
          <div className="space-y-3 md:space-y-4">
            {analyses.map((job) => {
              const strokeInfo = getStrokeInfo(job.stroke_type);

              return (
                <div
                  key={job.id}
                  onClick={() => job.status === "completed" && job.result_json && handleViewAnalysis(job)}
                  className={`bg-neutral-50 border border-neutral-200 rounded-xl md:rounded-2xl p-4 md:p-5 transition-all
                    ${job.status === "completed" && job.result_json 
                      ? "hover:bg-neutral-100 hover:border-neutral-300 cursor-pointer active:scale-[0.99]" 
                      : ""
                    }`}
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Icon */}
                    <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-black flex items-center justify-center text-xl md:text-2xl flex-shrink-0">
                      {strokeInfo.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5 md:mb-2">
                        <div className="min-w-0">
                          <h3 className="text-sm md:text-lg font-bold text-black truncate">
                            {strokeInfo.label} Analysis
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs text-neutral-500 mt-0.5 md:mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                              {formatDate(job.created_at)}
                            </span>
                            {job.processing_time_sec && (
                              <span className="flex items-center gap-1 hidden sm:flex">
                                <Timer className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                {job.processing_time_sec.toFixed(1)}s
                              </span>
                            )}
                            {job.total_frames && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                {job.total_frames} frames
                              </span>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                    </div>

                    {/* Action Button - Desktop only */}
                    {job.status === "completed" && job.result_json && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAnalysis(job);
                        }}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-bold text-sm"
                      >
                        <Play className="w-4 h-4" />
                        View
                      </button>
                    )}

                    {/* Mobile Arrow */}
                    {job.status === "completed" && job.result_json && (
                      <div className="md:hidden flex items-center">
                        <Play className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
