/**
 * Client-safe helper to build a public URL for an object in the
 * `profile-images` bucket. Mirrors `getProfileImagePublicUrl` from the
 * server-only storage module but works in client components too.
 */
export function publicProfileImageUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/profile-images/${path}`;
}
