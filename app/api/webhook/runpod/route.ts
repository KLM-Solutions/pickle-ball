/**
 * RunPod Webhook Endpoint
 * 
 * This endpoint receives notifications from RunPod when a job completes.
 * RunPod sends a POST request with the job result to this URL.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service key for webhook (server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = await request.json();
    
    console.log("=== RunPod Webhook Received ===");
    console.log("Status:", payload.status);
    console.log("Job ID:", payload.id);

    // RunPod webhook payload structure
    const {
      id: runpodJobId,
      status,
      output,
      error: jobError,
    } = payload;

    // Extract our job_id from the output or input
    const jobId = output?.job_id || payload.input?.job_id;

    if (!jobId) {
      console.error("No job_id in webhook payload");
      return NextResponse.json({ 
        received: true, 
        warning: "No job_id found" 
      });
    }

    console.log("Internal Job ID:", jobId);

    // Handle different statuses
    if (status === "COMPLETED" && output) {
      // Transform the result
      const transformedResult = {
        job_id: jobId,
        stroke_type: output.stroke_type || payload.input?.stroke_type,
        videoUrl: output.video_url,
        frames: (output.frames || []).map((frame: any, index: number) => ({
          frameIndex: index,
          timestampSec: frame.timestampSec,
          bbox: frame.bbox,
          confidence: frame.confidence,
          metrics: frame.metrics,
        })),
        strokes: output.strokes || [],
        playerStats: output.summary ? {
          totalDistanceMeters: output.summary.total_distance_m,
          avgSpeedKmh: output.summary.avg_speed_kmh,
          trackedDurationSec: output.summary.tracked_duration_sec,
        } : undefined,
        injuryRiskSummary: output.injury_risk_summary,
        processingTime: output.processing_time_sec,
      };

      // Update job in database
      const { error: updateError } = await supabase
        .from("analysis_jobs")
        .update({
          status: "completed",
          result_video_url: output.video_url || null,
          result_json: transformedResult,
          processing_time_sec: output.processing_time_sec,
          total_frames: output.frames?.length || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (updateError) {
        console.error("Failed to update job:", updateError);
        return NextResponse.json(
          { error: "Failed to update job", details: updateError.message },
          { status: 500 }
        );
      }

      console.log(`Job ${jobId} marked as COMPLETED`);
      return NextResponse.json({ 
        received: true, 
        status: "completed",
        job_id: jobId 
      });

    } else if (status === "FAILED") {
      // Update job as failed
      const errorMessage = jobError || output?.error || "Job failed";

      const { error: updateError } = await supabase
        .from("analysis_jobs")
        .update({
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (updateError) {
        console.error("Failed to update failed job:", updateError);
      }

      console.log(`Job ${jobId} marked as FAILED:`, errorMessage);
      return NextResponse.json({ 
        received: true, 
        status: "failed",
        job_id: jobId,
        error: errorMessage
      });

    } else if (status === "IN_PROGRESS") {
      // Job is still running - update status
      await supabase
        .from("analysis_jobs")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      console.log(`Job ${jobId} is IN_PROGRESS`);
      return NextResponse.json({ 
        received: true, 
        status: "processing",
        job_id: jobId 
      });
    }

    // Unknown status
    console.log(`Job ${jobId} has status: ${status}`);
    return NextResponse.json({ 
      received: true, 
      status: status,
      job_id: jobId 
    });

  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 }
    );
  }
}

// Also handle GET for health checks
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "RunPod Webhook",
    timestamp: new Date().toISOString()
  });
}

