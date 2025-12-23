/**
 * RunPod Serverless Client for StrikeSense
 * 
 * Calls the Python video analysis worker on RunPod.
 */

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
  console.warn('RunPod environment variables not set');
}

const RUNPOD_BASE_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;

export interface AnalysisInput {
  video_url: string;
  stroke_type: string;
  crop_region?: string;
  target_point?: string;
  step?: number;
  job_id?: string;
}

export interface FrameResult {
  frameIndex: number;
  timestampSec: number;
  bbox: [number, number, number, number];
  confidence: number;
  metrics: {
    right_elbow_flexion?: number;
    right_shoulder_abduction?: number;
    right_knee_flexion?: number;
    hip_rotation_deg?: number;
    injury_risk?: 'low' | 'medium' | 'high';
    feedback?: string[];
    [key: string]: any;
  };
}

export interface StrokeSegment {
  stroke_type: string;
  start_frame: number;
  end_frame: number;
  startSec: number;
  endSec: number;
  confidence: number;
}

export interface AnalysisResult {
  status: 'success' | 'error';
  job_id: string;
  video_url: string | null;
  frames: FrameResult[];
  strokes: StrokeSegment[];
  summary: {
    total_distance_m?: number;
    avg_speed_kmh?: number;
    tracked_duration_sec?: number;
    dominant_stroke?: string;
  };
  injury_risk_summary: {
    overall_risk?: 'low' | 'medium' | 'high';
    alerts?: any[];
    recommendations?: any[];
  };
  total_frames_processed: number;
  processing_time_sec: number;
  error?: string;
}

/**
 * Start an analysis job (async - returns job ID)
 */
export async function startAnalysis(input: AnalysisInput): Promise<string> {
  const response = await fetch(`${RUNPOD_BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RunPod API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.id; // RunPod job ID
}

/**
 * Check status of a RunPod job
 */
export async function checkJobStatus(runpodJobId: string): Promise<{
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: AnalysisResult;
  error?: string;
}> {
  const response = await fetch(`${RUNPOD_BASE_URL}/status/${runpodJobId}`, {
    headers: {
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`RunPod status error: ${response.status}`);
  }

  return response.json();
}

/**
 * Run analysis synchronously (waits for completion)
 * Use for shorter videos (< 5 minutes)
 */
export async function runAnalysisSync(
  input: AnalysisInput,
  timeoutMs: number = 600000 // 10 minutes
): Promise<AnalysisResult> {
  const response = await fetch(`${RUNPOD_BASE_URL}/runsync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RunPod API error: ${response.status} - ${text}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.output as AnalysisResult;
}

/**
 * Poll for job completion (for async jobs)
 */
export async function waitForCompletion(
  runpodJobId: string,
  maxWaitMs: number = 600000,
  pollIntervalMs: number = 3000
): Promise<AnalysisResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkJobStatus(runpodJobId);

    if (status.status === 'COMPLETED') {
      if (!status.output) {
        throw new Error('Job completed but no output');
      }
      return status.output;
    }

    if (status.status === 'FAILED') {
      throw new Error(status.error || 'Analysis job failed');
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Analysis timed out');
}

/**
 * Cancel a running job
 */
export async function cancelJob(runpodJobId: string): Promise<void> {
  await fetch(`${RUNPOD_BASE_URL}/cancel/${runpodJobId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
  });
}

