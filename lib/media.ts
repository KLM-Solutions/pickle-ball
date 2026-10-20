/**
 * Storage Media Links
 *
 * Videos are stored in the DB as Supabase public-style links. The storage buckets
 * are private, so the browser loads them through /api/media, which checks access
 * and redirects to a short-lived signed URL.
 */

const STORAGE_PUBLIC_PREFIX = '/storage/v1/object/public/';
const MEDIA_BUCKETS = ['videos', 'analysis-results'];

export interface StorageObject {
  bucket: string;
  path: string;
}

/**
 * Parse a Supabase storage link from this project into bucket + path.
 * Returns null for anything else (blob: URLs, other hosts, other buckets).
 */
export function parseStorageUrl(url: string | null | undefined): StorageObject | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !supabaseUrl) return null;

  const prefix = `${supabaseUrl}${STORAGE_PUBLIC_PREFIX}`;
  if (!url.startsWith(prefix)) return null;

  const rest = url.slice(prefix.length).split('?')[0];
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;

  const bucket = rest.slice(0, slash);
  const path = decodeURIComponent(rest.slice(slash + 1));
  if (!MEDIA_BUCKETS.includes(bucket) || !path || path.includes('..')) return null;

  return { bucket, path };
}

/**
 * Route a stored storage link through /api/media. Other URLs are returned unchanged.
 */
export function mediaUrl(url: string): string;
export function mediaUrl(url: string | null | undefined): string | null | undefined;
export function mediaUrl(url: string | null | undefined): string | null | undefined {
  if (!url || !parseStorageUrl(url)) return url;
  return `/api/media?url=${encodeURIComponent(url)}`;
}
