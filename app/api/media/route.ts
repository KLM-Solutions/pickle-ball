/**
 * Media API Route
 *
 * GET /api/media?url=<stored storage link>
 *
 * Checks the user may see the file, then redirects to a short-lived signed URL.
 * - Demo video: always allowed
 * - analysis-results/<job_id>/...: job must belong to the signed-in user
 * - videos/...: the first job using this upload must belong to the user; a fresh
 *   upload with no job yet (crop step) is allowed for a signed-in user
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseStorageUrl } from "@/lib/media";
import { canAccessResult, canAccessUpload, signStorageUrl } from "@/lib/media-server";

const DEMO_JOB_ID = "762644e0-0192-49d9-bf85-a127c3b56449";
const SIGNED_URL_TTL_SEC = 6 * 60 * 60;

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
      const allowed = object.bucket === "analysis-results"
        ? await canAccessResult(object, userId)
        : await canAccessUpload(url, object, userId);

      if (!allowed) {
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
