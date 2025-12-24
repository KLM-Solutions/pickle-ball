/**
 * Video Analysis API Route
 * 
 * Receives video URL and parameters, calls RunPod serverless worker,
 * stores results in Supabase, and returns analysis results.
 * 
 * ALL database storage is handled here in TypeScript, NOT in Python.
 */

import { NextResponse } from "next/server";
import { runAnalysisSync, startAnalysis, waitForCompletion } from "@/lib/runpod";
import { 
  createAnalysisJob, 
  updateJobToProcessing, 
  updateJobCompleted, 
  updateJobFailed 
} from "@/lib/supabase";

export const maxDuration = 300; // This function can run for a maximum of 5 minutes

type StrokeType =
  | "serve"
  | "groundstroke"
  | "dink"
  | "overhead"
  | "footwork"
  | "overall";

export async function POST(request: Request): Promise<NextResponse> {
  let jobId: string | undefined;

  try {
    const body = await request.json();

    const {
      videoUrl,
      strokeType,
      cropRegion,
      targetPoint,
      step = 1, // Analyze every frame by default
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

    // 1. CREATE JOB IN DATABASE (TypeScript handles DB storage)
    console.log("Creating analysis job in database...");
    jobId = await createAnalysisJob({
      videoUrl,
      strokeType,
      cropRegion,
      targetPoint,
      step: Number(step),
    });
    console.log("Job created:", jobId);

    // 2. Update job status to processing
    await updateJobToProcessing(jobId);

    // Build RunPod input (Python only does analysis, no DB writes)
    const runpodInput = {
      video_url: videoUrl,
      stroke_type: strokeType as StrokeType,
      crop_region: cropRegion || undefined,
      target_point: targetPoint || undefined,
      step: Number(step),
      job_id: jobId, // Pass job_id for reference but Python won't write to DB
    };

    console.log("Starting RunPod analysis:", {
      job_id: jobId,
      stroke_type: strokeType,
      step,
      async,
    });

    if (async) {
      // Async mode: start job and return ID immediately
      const runpodJobId = await startAnalysis(runpodInput);
      return NextResponse.json({
        status: "processing",
        job_id: jobId,
        runpod_job_id: runpodJobId,
        message: "Analysis started. Poll /api/analyze/status for results.",
      });
    }

    // 3. Sync mode: wait for RunPod completion
    const result = await runAnalysisSync(runpodInput, 600000); // 10 min timeout

    // 4. Transform response for frontend
    const transformedResult = {
      job_id: jobId,
      stroke_type: strokeType,
      videoUrl: result.video_url,
      frames: result.frames.map((frame: any, index: number) => ({
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
    };

    // 5. STORE RESULTS IN DATABASE (TypeScript handles all DB storage)
    console.log("Storing results in database...");
    await updateJobCompleted(jobId, {
      resultVideoUrl: result.video_url || undefined,
      resultJson: transformedResult,
      processingTimeSec: result.processing_time_sec,
      totalFrames: result.frames?.length || 0,
    });
    console.log("Results stored successfully");

    return NextResponse.json(transformedResult);

  } catch (error: any) {
    console.error("Analysis error:", error);

    // Update job status to failed if we have a job ID
    if (jobId) {
      await updateJobFailed(jobId, error.message || String(error));
    }

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
