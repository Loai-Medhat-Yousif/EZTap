import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  MAX_PRINT_DESIGN_BYTES,
  PRINT_DESIGN_BUCKET,
  type PrintTemplateKind,
} from "@/lib/print/template";
import { detectImageType, type ImageMimeType } from "@/lib/storage/profile-images";

export { MAX_PRINT_DESIGN_BYTES, PRINT_DESIGN_BUCKET };

export type PrintDesignValidationError = "type" | "size";

const EXTENSION: Record<ImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads the global card design. A unique path per upload (like profile
 * images) so replacing the design is never masked by a stale CDN copy at
 * an unchanged public URL.
 *
 * PNG/JPEG only: PDF embedding (pdf-lib) can't render WebP, so accepting
 * it here would store a design the PDF generator then silently drops.
 */
export async function uploadPrintDesign(
  supabase: SupabaseClient<Database>,
  file: File,
  kind: PrintTemplateKind,
): Promise<{ path: string } | { error: PrintDesignValidationError }> {
  if (file.size > MAX_PRINT_DESIGN_BYTES) return { error: "size" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType || contentType === "image/webp") return { error: "type" };

  const path = `${kind}-design-${Date.now()}.${EXTENSION[contentType]}`;

  const { error } = await supabase.storage
    .from(PRINT_DESIGN_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) throw error;
  return { path };
}

export async function deletePrintDesign(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(PRINT_DESIGN_BUCKET)
    .remove([path]);
  if (error) throw error;
}

export function getPrintDesignPublicUrl(
  supabase: SupabaseClient<Database>,
  path: string,
): string {
  return supabase.storage.from(PRINT_DESIGN_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

/** Fetches the raw design bytes for the server-side PDF generator. */
export async function downloadPrintDesign(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage
    .from(PRINT_DESIGN_BUCKET)
    .download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
