/**
 * Media API Route
 *
 * GET /api/media?url=<stored storage link>
 *
 * Checks the user may see the file, then redirects to a short-lived signed URL.
 * - Demo video: always allowed
 * - analysis-results/<job_id>/...: job must belong to the signed-in user
 * - videos/...: jobs using this upload must belong to the user; a fresh upload
 *   with no job yet (crop step) is allowed for any signed-in user
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseStorageUrl, StorageObject } from "@/lib/media";
import { getStorageAdmin, signStorageUrl } from "@/lib/media-server";

const DEMO_JOB_ID = "762644e0-0192-49d9-bf85-a127c3b56449";
const SIGNED_URL_TTL_SEC = 6 * 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function canAccess(object: StorageObject, url: string, userId: string): Promise<boolean> {
  const db = getStorageAdmin();

  if (object.bucket === "analysis-results") {
    const jobId = object.path.split("/")[0];
    if (!UUID_RE.test(jobId)) return false;

    const { data, error } = await db
      .from("analysis_jobs")
      .select("user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (error) throw error;
    return !!data && (data.user_id === null || data.user_id === userId);
  }

  const { data, error } = await db
    .from("analysis_jobs")
    .select("user_id")
    .eq("video_url", url);

  if (error) throw error;
  if (!data || data.length === 0) return true;
  return data.some((job) => job.user_id === null || job.user_id === userId);
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url).searchParams.get("url");
  const object = parseStorageUrl(url);

  if (!url || !object) {
    return NextResponse.json({ error: "Invalid media url" }, { status: 400 });
  }

  const isDemo = object.bucket === "analysis-results" && object.path.startsWith(`${DEMO_JOB_ID}/`);

  if (!isDemo) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    try {
      if (!(await canAccess(object, url, userId))) {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
      }
    } catch (error) {
      console.error("Media access check failed:", error);
      return NextResponse.json({ error: "Failed to check access" }, { status: 500 });
    }
  }

  const signedUrl = await signStorageUrl(url, SIGNED_URL_TTL_SEC);
  const response = NextResponse.redirect(signedUrl, 307);
  response.headers.set("Cache-Control", "private, max-age=300");
  return response;
}
