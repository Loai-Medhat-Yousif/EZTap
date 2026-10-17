"use client";

/**
 * Browser-side helper that turns the region the user framed in the crop
 * dialog into a square image blob, ready to upload. Produces a WebP at a
 * fixed square size so avatars are consistent regardless of what the
 * camera or phone produced (portrait, landscape, huge, …).
 */

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const OUTPUT_SIZE = 512;
const OUTPUT_QUALITY = 0.9;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load that image."));
    img.src = src;
  });
}

/**
 * Renders the crop region at a fixed square output size. The circle in
 * the dialog is only a guide — the stored image is a full square, so it
 * reads well in both round and square frames.
 */
export async function cropImageToBlob(
  imageSrc: string,
  area: CropArea,
): Promise<Blob | null> {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", OUTPUT_QUALITY);
  });
}
