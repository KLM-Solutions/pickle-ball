/**
 * Supabase Client for StrikeSense
 * 
 * Handles video uploads and result fetching.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload a video file to Supabase Storage
 * @param file - Video file to upload
 * @returns Public URL of the uploaded video
 */
export async function uploadVideo(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Create a new analysis job in the database
 */
export async function createAnalysisJob(params: {
  videoUrl: string;
  strokeType: string;
  cropRegion?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('analysis_jobs')
    .insert({
      video_url: params.videoUrl,
      stroke_type: params.strokeType,
      crop_region: params.cropRegion,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Create job error:', error);
    throw new Error(`Failed to create analysis job: ${error.message}`);
  }

  return data.id;
}

/**
 * Get analysis job status and results
 */
export async function getAnalysisJob(jobId: string) {
  const { data, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    throw new Error(`Failed to get job: ${error.message}`);
  }

  return data;
}

/**
 * Poll for job completion
 */
export async function waitForJobCompletion(
  jobId: string,
  maxWaitMs: number = 600000, // 10 minutes
  pollIntervalMs: number = 2000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const job = await getAnalysisJob(jobId);

    if (job.status === 'completed') {
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(job.error_message || 'Analysis failed');
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Analysis timed out');
}

/**
 * Delete a video from storage (cleanup)
 */
export async function deleteVideo(videoUrl: string): Promise<void> {
  // Extract path from URL
  const urlParts = videoUrl.split('/storage/v1/object/public/videos/');
  if (urlParts.length !== 2) return;

  const filePath = urlParts[1];

  await supabase.storage
    .from('videos')
    .remove([filePath]);
}

