/**
 * Video Analysis API Route
 * 
 * Receives video URL and parameters, calls RunPod serverless worker,
 * returns analysis results.
 * 
 * NO Python, NO ffmpeg, NO local processing.
 */

import { NextResponse } from "next/server";
import { runAnalysisSync, startAnalysis, waitForCompletion } from "@/lib/runpod";

export const runtime = "edge"; // Use edge runtime for faster cold starts

type StrokeType =
  | "serve"
  | "groundstroke"
  | "dink"
  | "overhead"
  | "footwork"
  | "overall";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const {
      videoUrl,
      strokeType,
      cropRegion,
      targetPoint,
      step = 3,
      jobId,
      async = false, // If true, return job ID immediately
    } = body;

    // Validate required fields
    if (!videoUrl) {
      return NextResponse.json(
        { error: "Missing required field: videoUrl" },
        { status: 400 }
      );
    }

    if (!strokeType) {
      return NextResponse.json(
        { error: "Missing required field: strokeType" },
        { status: 400 }
      );
    }

    // Validate video URL (must be from Supabase or allowed origins)
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "https://", // Allow any HTTPS for flexibility
    ].filter(Boolean);

    const isValidUrl = allowedOrigins.some(origin => videoUrl.startsWith(origin!));
    if (!isValidUrl) {
      return NextResponse.json(
        { error: "Invalid video URL origin" },
        { status: 400 }
      );
    }

    // Build RunPod input
    const runpodInput = {
      video_url: videoUrl,
      stroke_type: strokeType as StrokeType,
      crop_region: cropRegion || undefined,
      target_point: targetPoint || undefined,
      step: Number(step),
      job_id: jobId || undefined,
    };

    console.log("Starting RunPod analysis:", {
      stroke_type: strokeType,
      step,
      async,
    });

    if (async) {
      // Async mode: start job and return ID immediately
      const runpodJobId = await startAnalysis(runpodInput);
      return NextResponse.json({
        status: "processing",
        runpod_job_id: runpodJobId,
        message: "Analysis started. Poll /api/analyze/status for results.",
      });
    }

    // Sync mode: wait for completion (default)
    const result = await runAnalysisSync(runpodInput, 600000); // 10 min timeout

    // Transform response to match frontend expectations
    return NextResponse.json({
      stroke_type: strokeType,
      videoUrl: result.video_url,
      frames: result.frames.map((frame, index) => ({
        frameIndex: index,
        timestampSec: frame.timestampSec,
        bbox: frame.bbox,
        confidence: frame.confidence,
        metrics: frame.metrics,
      })),
      strokes: result.strokes,
      playerStats: result.summary ? {
        totalDistanceMeters: result.summary.total_distance_m,
        avgSpeedKmh: result.summary.avg_speed_kmh,
        trackedDurationSec: result.summary.tracked_duration_sec,
      } : undefined,
      injuryRiskSummary: result.injury_risk_summary,
      processingTime: result.processing_time_sec,
    });

  } catch (error: any) {
    console.error("Analysis error:", error);

    // Handle timeout
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: "Analysis timed out. Try a shorter video or increase step." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to analyze video",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
