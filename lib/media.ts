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
 * The exact link supabase-js getPublicUrl() produces for an object.
 */
export function canonicalStorageUrl({ bucket, path }: StorageObject): string {
  return encodeURI(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${STORAGE_PUBLIC_PREFIX}${bucket}/${path}`);
}

/**
 * Parse a Supabase storage link from this project into bucket + path.
 * Returns null for anything else (blob: URLs, other hosts, other buckets), and for
 * links not in canonical form, so access checks always compare the stored spelling.
 */
export function parseStorageUrl(url: string | null | undefined): StorageObject | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !supabaseUrl) return null;

  const prefix = `${supabaseUrl}${STORAGE_PUBLIC_PREFIX}`;
  if (!url.startsWith(prefix)) return null;

  const rest = url.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;

  const bucket = rest.slice(0, slash);
  let path: string;
  try {
    path = decodeURI(rest.slice(slash + 1));
  } catch {
    return null;
  }
  const badPath = !path || /[?#]/.test(path) || path.split('/').some((part) => part === '' || part === '..');
  if (!MEDIA_BUCKETS.includes(bucket) || badPath) return null;

  const object = { bucket, path };
  return canonicalStorageUrl(object) === url ? object : null;
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
