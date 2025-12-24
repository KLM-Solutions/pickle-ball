/**
 * Supabase Database Client for Analysis History
 * 
 * Handles queries to the analysis_jobs table for:
 * - Fetching analysis history
 * - Getting individual job details
 * - Storing LLM responses
 */

import { createClient } from "@supabase/supabase-js";

// Types for analysis jobs
export interface AnalysisJob {
  id: string;
  created_at: string;
  updated_at: string;
  video_url: string;
  stroke_type: string;
  crop_region: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  result_video_url: string | null;
  result_json: any | null;
  input_json: any | null;
  processing_time_sec: number | null;
  total_frames: number | null;
}

// Create Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Fetch analysis history (most recent first)
 */
export async function getAnalysisHistory(limit: number = 20): Promise<AnalysisJob[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch analysis history:", error);
    return [];
  }
}

/**
 * Fetch a single analysis job by ID
 */
export async function getAnalysisJob(jobId: string): Promise<AnalysisJob | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      console.error("Error fetching job:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch analysis job:", error);
    return null;
  }
}

/**
 * Fetch completed analyses only
 */
export async function getCompletedAnalyses(limit: number = 20): Promise<AnalysisJob[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching completed analyses:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch completed analyses:", error);
    return [];
  }
}

/**
 * Fetch all analyses (including processing, pending, completed, failed)
 */
export async function getAllAnalyses(limit: number = 50): Promise<AnalysisJob[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching all analyses:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch all analyses:", error);
    return [];
  }
}

/**
 * Get analysis count by status
 */
export async function getAnalysisCounts(): Promise<Record<string, number>> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("status");

    if (error) {
      console.error("Error fetching counts:", error);
      return { completed: 0, pending: 0, failed: 0 };
    }

    const counts: Record<string, number> = {
      completed: 0,
      pending: 0,
      processing: 0,
      failed: 0,
    };

    (data || []).forEach((job: { status: string }) => {
      counts[job.status] = (counts[job.status] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error("Failed to fetch counts:", error);
    return { completed: 0, pending: 0, failed: 0 };
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Get stroke type display info
 */
export function getStrokeInfo(strokeType: string): { icon: string; color: string; label: string } {
  const strokeInfo: Record<string, { icon: string; color: string; label: string }> = {
    serve: { icon: "🎾", color: "emerald", label: "Serve" },
    dink: { icon: "🤏", color: "violet", label: "Dink" },
    groundstroke: { icon: "💪", color: "orange", label: "Drive" },
    overhead: { icon: "⚡", color: "blue", label: "Overhead" },
  };

  return strokeInfo[strokeType] || { icon: "🏓", color: "slate", label: strokeType };
}

