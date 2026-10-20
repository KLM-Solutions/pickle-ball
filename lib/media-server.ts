/**
 * Server-side storage helpers (service key only — never import from client code).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseStorageUrl } from './media';

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
