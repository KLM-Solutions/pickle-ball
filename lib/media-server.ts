/**
 * Server-side storage helpers (service key only — never import from client code).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseStorageUrl, StorageObject } from './media';

// An upload with no analysis job yet (crop step) is only reachable this long
const FRESH_UPLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let adminClient: SupabaseClient | null = null;

export function getStorageAdmin(): SupabaseClient {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseServiceKey) {
      console.warn('SUPABASE_SERVICE_KEY not set - signed media URLs will not work on private buckets');
    }
    adminClient = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return adminClient;
}

/**
 * Can this user see an analysis result? The job must be theirs.
 */
export async function canAccessResult(object: StorageObject, userId: string): Promise<boolean> {
  const jobId = object.path.split('/')[0];
  if (!UUID_RE.test(jobId)) return false;

  const { data, error } = await getStorageAdmin()
    .from('analysis_jobs')
    .select('user_id')
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw error;
  return !!data && data.user_id === userId;
}

/**
 * Can this user use an uploaded video? The first job created for it belongs to the
 * uploader. With no job yet (crop step), only a fresh upload is allowed.
 */
export async function canAccessUpload(url: string, object: StorageObject, userId: string): Promise<boolean> {
  const db = getStorageAdmin();

  const { data: firstJob, error } = await db
    .from('analysis_jobs')
    .select('user_id')
    .eq('video_url', url)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (firstJob) return firstJob.user_id === userId;

  const slash = object.path.lastIndexOf('/');
  const folder = slash === -1 ? '' : object.path.slice(0, slash);
  const name = object.path.slice(slash + 1);

  const { data: files, error: listError } = await db.storage
    .from(object.bucket)
    .list(folder, { search: name, limit: 100 });

  if (listError) throw listError;
  const file = files?.find((f) => f.name === name);
  return !!file?.created_at && Date.now() - new Date(file.created_at).getTime() < FRESH_UPLOAD_WINDOW_MS;
}

/**
 * Create a signed URL for a stored storage link.
 * Falls back to the original link if signing fails (still works while a bucket is public).
 */
export async function signStorageUrl(url: string, expiresInSec: number): Promise<string> {
  const object = parseStorageUrl(url);
  if (!object) return url;

  const { data, error } = await getStorageAdmin()
    .storage
    .from(object.bucket)
    .createSignedUrl(object.path, expiresInSec);

  if (error || !data?.signedUrl) {
    console.error(`Failed to sign ${object.bucket}/${object.path}:`, error);
    return url;
  }

  return data.signedUrl;
}
