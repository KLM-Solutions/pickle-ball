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
    // Store the result in sessionStorage and navigate to player page
    if (job.result_json) {
      const analysisResult = {
        ...job.result_json,
        videoUrl: job.result_video_url,
        stroke_type: job.stroke_type,
      };
      sessionStorage.setItem("analysisResult", JSON.stringify(analysisResult));
      router.push(`/strikesense/player?stroke=${job.stroke_type}&job_id=${job.id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] md:text-xs font-bold">
            <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3" /> 
            <span className="hidden sm:inline">Completed</span>
            <span className="sm:hidden">Done</span>
          </span>
        );
      case "processing":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] md:text-xs font-bold">
            <Loader2 className="w-2.5 h-2.5 md:w-3 md:h-3 animate-spin" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] md:text-xs font-bold">
            <XCircle className="w-2.5 h-2.5 md:w-3 md:h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-400 rounded-full text-[10px] md:text-xs font-bold">
            <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-10 left-5 md:top-20 md:left-10 w-48 md:w-72 h-48 md:h-72 bg-emerald-500 rounded-full filter blur-[100px] md:blur-[128px]" />
        <div className="absolute bottom-10 right-5 md:bottom-20 md:right-10 w-64 md:w-96 h-64 md:h-96 bg-violet-500 rounded-full filter blur-[100px] md:blur-[128px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm sticky top-0 bg-slate-900 md:bg-slate-900/80">
        <div className="max-w-5xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition p-1"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm font-medium hidden sm:inline">Home</span>
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold">History</h1>
                <p className="text-[10px] md:text-xs text-slate-400">{analyses.length} analyses</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-xs md:text-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-xs md:text-sm font-bold shadow-lg shadow-emerald-500/30"
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
            <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-emerald-400 animate-spin mb-4" />
            <p className="text-slate-400 text-sm md:text-base">Loading history...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16 md:py-20">
            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <XCircle className="w-7 h-7 md:w-8 md:h-8 text-red-400" />
            </div>
            <h2 className="text-lg md:text-xl font-bold mb-2">Failed to Load</h2>
            <p className="text-slate-400 mb-6 text-sm md:text-base px-4">{error}</p>
            <button
              onClick={fetchHistory}
              className="px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-bold text-sm md:text-base"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && analyses.length === 0 && (
          <div className="text-center py-16 md:py-20">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 md:mb-6 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-slate-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">No Analyses Yet</h2>
            <p className="text-slate-400 mb-6 text-sm md:text-base px-4">
              Complete your first stroke analysis to see it here
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-bold shadow-lg shadow-emerald-500/30 text-sm md:text-base"
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
              const gradients: Record<string, string> = {
                emerald: "from-emerald-500 to-teal-600",
                violet: "from-violet-500 to-purple-600",
                orange: "from-orange-500 to-red-500",
                blue: "from-blue-500 to-indigo-600",
                slate: "from-slate-500 to-slate-600",
              };

              return (
                <div
                  key={job.id}
                  onClick={() => job.status === "completed" && job.result_json && handleViewAnalysis(job)}
                  className={`bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 transition-all
                    ${job.status === "completed" && job.result_json 
                      ? "hover:bg-white/10 hover:border-white/20 cursor-pointer active:scale-[0.99]" 
                      : ""
                    }`}
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Icon */}
                    <div
                      className={`w-11 h-11 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${gradients[strokeInfo.color]} flex items-center justify-center text-xl md:text-2xl flex-shrink-0 shadow-lg`}
                    >
                      {strokeInfo.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5 md:mb-2">
                        <div className="min-w-0">
                          <h3 className="text-sm md:text-lg font-bold text-white truncate">
                            {strokeInfo.label} Analysis
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs text-slate-400 mt-0.5 md:mt-1">
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

                      {/* Quick Stats */}
                      {job.result_json && (
                        <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-3">
                          {job.result_json.strokes?.length > 0 && (
                            <span className="text-[10px] md:text-xs text-slate-400">
                              {job.result_json.strokes.length} strokes
                            </span>
                          )}
                          {job.result_json.injury_risk_summary?.overall_risk && (
                            <span
                              className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded ${
                                job.result_json.injury_risk_summary.overall_risk === "low"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : job.result_json.injury_risk_summary.overall_risk === "medium"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {job.result_json.injury_risk_summary.overall_risk} risk
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button - Desktop only */}
                    {job.status === "completed" && job.result_json && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAnalysis(job);
                        }}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30"
                      >
                        <Play className="w-4 h-4" />
                        View
                      </button>
                    )}

                    {/* Mobile Arrow */}
                    {job.status === "completed" && job.result_json && (
                      <div className="md:hidden flex items-center">
                        <Play className="w-4 h-4 text-emerald-400" />
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
