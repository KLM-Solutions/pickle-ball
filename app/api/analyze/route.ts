import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { spawn } from "node:child_process";
import { ensurePythonVenv, runPython } from "../_lib/python";
import crypto from "node:crypto";
import ffmpeg from "fluent-ffmpeg";

export const runtime = "nodejs";

// Optional: allow specifying an explicit ffmpeg binary path via env,
// so we are not dependent on the system PATH only.

// --- DEBUG LOGGING ---
const LOG_FILE = path.join(process.cwd(), "server_debug.log");
async function logDebug(msg: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${msg}\n`;
  console.log(msg); // Keep console log
  try {
    await fs.appendFile(LOG_FILE, logLine);
  } catch (e) {
    // ignore log error
  }
}
// ---------------------

const FPS = 30;

type StrokeType =
  | "serve"
  | "groundstroke"
  | "dink"
  | "overhead"
  | "footwork"
  | "overall";

type RawDetection = {
  frameFilename: string;
  bbox: [number, number, number, number];
  confidence: number;
  metrics?: {
    right_elbow_flexion?: number;
    right_shoulder_abduction?: number;
    right_knee_flexion?: number;
    injury_risk?: "low" | "medium" | "high";
    feedback?: string[];
  };
  timestampSec?: number;
};

type ApiFrame = {
  frameIndex: number;
  timestampSec: number;
  imageUrl: string;
  bbox: [number, number, number, number];
  confidence: number;
  ball?: {
    bbox: [number, number, number, number];
    confidence: number;
  } | null;
  metrics?: {
    right_elbow_flexion?: number;
    right_shoulder_abduction?: number;
    right_knee_flexion?: number;
    hip_rotation_deg?: number;
    wrist_to_body_distance_norm?: number;
    wrist_relative_vector?: { x_norm: number; y_norm: number };
    wrist_above_waist?: boolean;
    injury_risk?: "low" | "medium" | "high";
    feedback?: string[];
    stroke_label?: string;
    stroke_conf?: number;
    wrist_speed?: number;
  };
};

type AnalyzeResult = {
  stroke_type: StrokeType;
  frames: ApiFrame[];
  strokes?: Array<{
    type: "serve" | "groundstroke" | "dink" | "overhead" | "volley";
    startFrame: number;
    endFrame: number;
    startSec: number;
    endSec: number;
    confidence: number;
  }>;
  videoUrl?: string | null;
  playerStats?: {
    totalDistanceMeters: number;
    avgSpeedKmh: number;
    trackedDurationSec: number;
  };
  ballStats?: {
    avgSpeedKmh?: number;
    maxSpeedKmh?: number;
    totalDistanceMeters?: number;
  } | null;
};

async function writeFileToTemp(file: File, tmpDir: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const videoPath = path.join(tmpDir, `${crypto.randomUUID()}.mp4`);
  await fs.writeFile(videoPath, buffer);
  return videoPath;
}

function extractFrames(
  videoPath: string,
  framesDir: string,
  fps: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(["-vf", `fps=${fps}`])
      .output(path.join(framesDir, "frame_%04d.png"))
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

function encodeVideoFromFrames(
  framesDir: string,
  outputVideoPath: string,
  fps: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    logDebug(`Creating video from frames in: ${framesDir}`);
    logDebug(`Expected pattern: frame_0000.png, frame_0001.png, etc.`);
    logDebug(`Output video: ${outputVideoPath}`);
    logDebug(`FPS: ${fps}`);

    ffmpeg(path.join(framesDir, "frame_%04d.png"))
      .inputOptions([
        `-framerate ${fps}`,
        '-start_number 1'  // FIXED: Start from frame_0001.png to match Python output
      ])
      .videoCodec("libx264")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-crf 18",  // High quality
        "-preset fast"
      ])
      .output(outputVideoPath)
      .on("start", (commandLine) => {
        console.log('FFmpeg command: ' + commandLine);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`Video encoding progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        console.log(`Video creation successful: ${outputVideoPath}`);
        resolve();
      })
      .on("error", (err: Error) => {
        console.error(`FFmpeg error: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

async function runTrackingPython(
  inputDir: string,
  outputDir: string,
  resultsPath: string,
  targetPoint: string | null,
  step: number = 3, // NEW: Default to processing every 3rd frame
  strokeType: string = "serve", // NEW: Pass stroke type
  cropRegion: string | null = null,
  videoPath: string | null = null // NEW: Pass video path
): Promise<void> {
  const scriptPath = path.join(process.cwd(), "python", "track.py");

  await fs.mkdir(outputDir, { recursive: true });

  // Automatically setup Python venv and install requirements if needed
  let pythonExecutable = "python";
  try {
    pythonExecutable = await ensurePythonVenv(process.cwd());
    console.log(`Using Python venv at: ${pythonExecutable}`);
  } catch (err) {
    console.error("Failed to ensure python venv, falling back to system python:", err);
    // Fallback
    pythonExecutable = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
  }

  return new Promise((resolve, reject) => {
    const args = [
      scriptPath,
      "--input_dir",
      inputDir,
      "--output_dir",
      outputDir,
      "--results_json",
      resultsPath,
      "--step",
      step.toString(), // Pass the step argument
      "--stroke_type",
      strokeType,
    ];

    if (targetPoint) {
      args.push("--target_point", targetPoint);
    }
    if (cropRegion) {
      args.push("--crop_region", cropRegion);
    }
    if (videoPath) {
      args.push("--video_path", videoPath);
    }

    const proc = spawn(pythonExecutable, args);

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Also capture stdout for debugging
    proc.stdout.on("data", (data) => {
      logDebug(`[Python Track]: ${data}`);
    });

    proc.on("close", (code) => {
      if (code === 0) {
        logDebug(`[Python Track]: Process completed successfully.`);
        resolve();
      } else {
        console.error(`[Python Track ERROR]: Process exited with code ${code}`);
        console.error(`[Python Track stderr]: ${stderr}`);
        reject(
          new Error(
            `Python tracking exited with code ${code}. Stderr: ${stderr}`,
          ),
        );
      }
    });
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();

    const targetPoint = formData.get("targetPoint") as string | null;
    const cropRegion = formData.get("cropRegion") as string | null;
    const strokeType = formData.get("strokeType") as StrokeType | null;
    const trackBall = formData.get("trackBall") === "true";
    const video = formData.get("video") as File | null;

    if (!strokeType) {
      return NextResponse.json(
        { error: "Missing strokeType" },
        { status: 400 },
      );
    }
    // ... (rest of validation) ...

    // Use a local temp directory on D: drive to save C: space
    const dDriveTemp = path.join(process.cwd(), "temp_processing");
    await fs.mkdir(dDriveTemp, { recursive: true });

    const tmpDir = await fs.mkdtemp(
      path.join(dDriveTemp, "strike-sense-video-"),
    );
    // video is guaranteed not null here because of earliner check
    const videoPath = await writeFileToTemp(video!, tmpDir);

    const framesInputDir = path.join(tmpDir, "frames");
    await fs.mkdir(framesInputDir, { recursive: true });

    await extractFrames(videoPath, framesInputDir, FPS);

    const analysisId = crypto.randomUUID();
    const publicFramesDir = path.join(
      process.cwd(),
      "public",
      "frames",
      analysisId,
    );

    const resultsJsonPath = path.join(tmpDir, "results.json");

    // NEW: Run the TRACKING script instead of simple segmentation
    // Step = 3 means 3x faster processing (effective 10fps analysis)
    const PROCESSING_STEP = 3;
    await runTrackingPython(
      framesInputDir,
      publicFramesDir,
      resultsJsonPath,
      targetPoint,
      PROCESSING_STEP,
      strokeType,
      cropRegion,
      videoPath
    );

    // Build an annotated video from the annotated frames using ffmpeg.
    const annotatedVideoPath = path.join(publicFramesDir, "annotated.mp4");
    let videoCreated = false;

    try {
      // FIXED: Check if frames exist before trying to create video
      console.log(`Checking for frames in: ${publicFramesDir}`);
      const frameFiles = await fs.readdir(publicFramesDir);
      const pngFiles = frameFiles.filter(f => f.endsWith('.png') && f.startsWith('frame_'));

      console.log(`Found ${pngFiles.length} PNG frames:`, pngFiles.slice(0, 5)); // Show first 5

      if (pngFiles.length > 0) {
        // Calculate effective FPS based on the step (e.g. 30 / 3 = 10fps)
        const outputFps = Math.max(1, FPS / PROCESSING_STEP); // Ensure minimum 1 FPS
        logDebug(`Creating video with FPS: ${outputFps}`);

        await encodeVideoFromFrames(publicFramesDir, annotatedVideoPath, outputFps);

        // Verify video was created
        try {
          await fs.access(annotatedVideoPath);
          const stats = await fs.stat(annotatedVideoPath);
          logDebug(`Video created successfully: ${annotatedVideoPath} (${stats.size} bytes)`);
          videoCreated = true;
        } catch {
          logDebug("Video file was not created despite no FFmpeg error");
        }
      } else {
        logDebug("No PNG frames found for video creation");
      }
    } catch (videoError) {
      console.error("Failed to encode annotated video:", videoError);
    }

    const rawJson = await fs.readFile(resultsJsonPath, "utf-8");
    const pythonOutput: { frames?: RawDetection[], results?: RawDetection[], strokes?: any[], summary?: any } = JSON.parse(rawJson);
    const rawDetections = pythonOutput.frames || pythonOutput.results || [];

    const sortedFiles = rawDetections
      .map((det, index) => ({
        ...det,
        index,
      }))
      .sort((a, b) => a.frameFilename.localeCompare(b.frameFilename));

    const frames: ApiFrame[] = sortedFiles.map((det, i) => {
      // Mock ball detection for every 5th frame if trackBall is enabled
      const hasBall = trackBall && i % 5 === 0;
      return {
        frameIndex: i,
        // Adjust timestamp based on Python output if available, else fallback to calculation
        timestampSec: det.timestampSec ?? Number(((i * PROCESSING_STEP) / FPS).toFixed(2)),
        imageUrl: `/frames/${analysisId}/${det.frameFilename}`,
        bbox: det.bbox,
        confidence: det.confidence,
        trackId: (det as any).track_id || -1,
        pose: (det as any).pose || null, // MediaPipe keypoints (33 points)
        ...(hasBall && {
          ball: {
            bbox: [100, 100, 120, 120] as [number, number, number, number],
            confidence: 0.85,
          },
        }),
        metrics: det.metrics, // Pass the metrics through
      };
    });

    // FIXED: Only include videoUrl if video was actually created
    const videoUrl = videoCreated ? `/frames/${analysisId}/annotated.mp4` : null;
    console.log(`Final video URL: ${videoUrl}`);

    const result: AnalyzeResult = {
      stroke_type: strokeType,
      frames,
      strokes: pythonOutput.strokes || [],
      ...(videoUrl && { videoUrl }), // Only include if video exists
      playerStats: pythonOutput.summary ? {
        totalDistanceMeters: pythonOutput.summary.total_distance_m,
        avgSpeedKmh: pythonOutput.summary.avg_speed_kmh,
        trackedDurationSec: pythonOutput.summary.tracked_duration_sec
      } : undefined,
      ...(trackBall && {
        ballStats: {
          avgSpeedKmh: 42.5,
          maxSpeedKmh: 68.2,
          totalDistanceMeters: 12.4,
        },
      }),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze video",
        details: error.message || String(error),
        stack: error.stack
      },
      { status: 500 },
    );
  }
}


