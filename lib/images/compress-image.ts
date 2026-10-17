"use client";

import { MAX_FILE_SIZE_BYTES } from "@/lib/images/limits";

/**
 * Browser-side image compression, run just before a profile photo is
 * uploaded. The Supabase bucket refuses anything over 5MB, and phone
 * cameras routinely produce photos well above that, so shrinking in the
 * browser means the admin gets a working upload instead of an error —
 * and a smaller transfer.
 *
 * Only files already over the limit are touched: re-encoding a small,
 * already-fine image would only risk making it worse. When compression
 * does run, it targets a sane on-screen size (longest side 1600px) and
 * steps the quality down, then the dimensions, until the result fits.
 */

const MAX_DIMENSION = 1600;
const MAX_DIMENSION_STEPS = 4;
const QUALITY_STEPS = [0.9, 0.82, 0.75, 0.65, 0.55, 0.45];

export type CompressResult = { file: File } | { error: string };

type Drawable = ImageBitmap | HTMLImageElement;

async function decode(
  file: File,
): Promise<{ source: Drawable; width: number; height: number; dispose: () => void } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Some formats/browsers reject createImageBitmap; fall through to
      // the <img> path, which is more forgiving.
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        dispose: () => URL.revokeObjectURL(url),
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function encode(
  source: Drawable,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

  return new Promise((resolve) => {
    // WebP keeps quality high at small sizes; browsers without an
    // encoder fall back to PNG, which detectImageType() still accepts.
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

function webpName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base || "photo"}.webp`;
}

export async function compressImageForUpload(
  file: File,
): Promise<CompressResult> {
  if (file.size <= MAX_FILE_SIZE_BYTES) return { file };
  if (typeof document === "undefined") {
    return { error: "Compression must run in the browser." };
  }

  const decoded = await decode(file);
  if (!decoded) {
    return { error: "Couldn't read that image. Try a JPEG, PNG, or WebP." };
  }

  try {
    let scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(decoded.width, decoded.height),
    );

    for (let attempt = 0; attempt < MAX_DIMENSION_STEPS; attempt++) {
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));

      for (const quality of QUALITY_STEPS) {
        const blob = await encode(decoded.source, width, height, quality);
        if (blob && blob.size <= MAX_FILE_SIZE_BYTES) {
          return {
            file: new File([blob], webpName(file.name), {
              type: blob.type || "image/webp",
              lastModified: Date.now(),
            }),
          };
        }
      }

      scale *= 0.75;
    }

    return { error: "Couldn't compress that image below 5MB. Try a smaller photo." };
  } finally {
    decoded.dispose();
  }
}
