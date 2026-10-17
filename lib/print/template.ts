/**
 * Shared print-layout constants and types. Client-safe (no `server-only`)
 * because both the browser editor and the server PDF generator import
 * them, and they must agree exactly for the editor to be WYSIWYG.
 *
 * There is one template per card type (`profile`, `google_review`). Each
 * template has its own physical size in centimetres; PostScript points
 * (1/72") are a stable unit for sizes, and positions are kept as
 * fractions of the page so any preview scale maps cleanly onto the real
 * thing.
 */

export const CM_TO_PT = 72 / 2.54; // 1cm = 28.3465pt

export type PrintTemplateKind = "profile" | "google_review";

export const PRINT_TEMPLATE_KINDS: readonly PrintTemplateKind[] = [
  "profile",
  "google_review",
];

export const MIN_DIMENSION_CM = 3;
export const MAX_DIMENSION_CM = 60;

export const DEFAULT_WIDTH_CM = 15;
export const DEFAULT_HEIGHT_CM = 20;

/** Object path within the `print-designs` Storage bucket. */
export const PRINT_DESIGN_BUCKET = "print-designs";

/** Print artwork can be large; the bucket allows up to 10MB. */
export const MAX_PRINT_DESIGN_BYTES = 10 * 1024 * 1024;

export type PrintTemplate = {
  kind: PrintTemplateKind;
  /** Physical page width/height in centimetres. */
  widthCm: number;
  heightCm: number;
  /** Object path of the design image, or null when none is set. */
  designPath: string | null;
  /** Card ID top-left anchor, fraction of page width/height (0..1). */
  cardIdX: number;
  cardIdY: number;
  /** Card ID font size in points. */
  cardIdFontSize: number;
  /** Card ID colour, `#rrggbb`. */
  cardIdColor: string;
  /** QR top-left anchor, fraction of page width/height (0..1). */
  qrX: number;
  qrY: number;
  /** QR square side length in points. */
  qrSize: number;
};

export function isPrintTemplateKind(value: unknown): value is PrintTemplateKind {
  return value === "profile" || value === "google_review";
}

export function pageWidthPt(template: Pick<PrintTemplate, "widthCm">): number {
  return template.widthCm * CM_TO_PT;
}

export function pageHeightPt(template: Pick<PrintTemplate, "heightCm">): number {
  return template.heightCm * CM_TO_PT;
}

export function pageAspectRatio(
  template: Pick<PrintTemplate, "widthCm" | "heightCm">,
): number {
  return template.widthCm / template.heightCm;
}

export function defaultPrintTemplate(kind: PrintTemplateKind): PrintTemplate {
  return {
    kind,
    widthCm: DEFAULT_WIDTH_CM,
    heightCm: DEFAULT_HEIGHT_CM,
    designPath: null,
    cardIdX: 0.08,
    cardIdY: 0.06,
    cardIdFontSize: 14,
    cardIdColor: "#111111",
    qrX: 0.66,
    qrY: 0.8,
    qrSize: 80,
  };
}

/** Clamp a 0..1 fraction, guarding against NaN. */
export function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
