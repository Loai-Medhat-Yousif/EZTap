import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { MAX_FILE_SIZE_BYTES } from "@/lib/images/limits";

export const PROFILE_IMAGE_BUCKET = "profile-images";

// Spec section 30: validate uploads, allow only appropriate image
// types, apply sensible size limits. The bucket itself enforces the
// same limits server-side (see the security-hardening migration); this
// is the app-level check that gives the admin a useful error first.
// MAX_FILE_SIZE_BYTES is shared with the browser-side compressor.
export { MAX_FILE_SIZE_BYTES };

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";
export type ImageValidationError = "type" | "size";

/**
 * Identifies the image format from the file's actual leading bytes.
 * `file.type` is whatever the browser (or a hand-crafted request) claims
 * and proves nothing; this is what decides what we store and what
 * Content-Type it is later served with. SVG is deliberately not
 * accepted — it can carry script.
 */
export function detectImageType(bytes: Uint8Array): ImageMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Every upload gets a fresh, unique object path. Overwriting one fixed
 * path would leave the CDN serving the *old* photo after a replace (the
 * public URL never changes, so neither does the cache key); a new path
 * per upload sidesteps that entirely, and the caller deletes the
 * previous object once nothing references it, so there are still no
 * orphans in the normal flow.
 */
function newProfileImagePath(cardUuid: string): string {
  return `${cardUuid}/avatar-${Date.now()}`;
}

export async function uploadProfileImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  file: File,
): Promise<{ path: string } | { error: ImageValidationError }> {
  // Size first, from the declared length, so an oversized file is
  // rejected before being read into memory.
  if (file.size > MAX_FILE_SIZE_BYTES) return { error: "size" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType) return { error: "type" };

  const path = newProfileImagePath(cardUuid);

  const { error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false,
      cacheControl: "31536000", // immutable: the path is unique per upload
    });

  if (error) throw error;
  return { path };
}

export async function deleteProfileImage(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
  path: string,
): Promise<void> {
  // Never delete outside this card's own folder, whatever `path` says.
  if (!path.startsWith(`${cardUuid}/`)) {
    throw new Error("deleteProfileImage: path is outside the card's folder");
  }

  const { error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .remove([path]);

  if (error) throw error;
}

export function getProfileImagePublicUrl(
  supabase: SupabaseClient<Database>,
  path: string,
): string {
  return supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}
