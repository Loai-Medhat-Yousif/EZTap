import type { CSSProperties } from "react";
import { DEFAULT_CARD_THEME } from "@/types";

/**
 * Quick-pick colours shown next to the free colour picker. They are just
 * shortcuts into the same hex input — the admin/customer can still pick
 * anything with the native picker or by typing a hex code.
 */
export const CARD_HOT_PICKS = [
  "#005cf2", // EZTab blue
  "#0f172a", // near black
  "#059669", // emerald
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#7c3aed", // violet
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#e11d48", // rose
  "#f97316", // orange
  "#f59e0b", // amber
  "#64748b", // slate
] as const;

const HEX6 = /^#?([0-9a-f]{6})$/i;
const HEX3 = /^#?([0-9a-f]{3})$/i;

/**
 * Parses a user-entered colour into `#rrggbb`, or null when it isn't a
 * hex colour. Accepts the `#` optionally and expands the 3-digit form,
 * because that's what people type by hand.
 */
export function parseCardAccent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();

  const six = HEX6.exec(trimmed);
  if (six) return `#${six[1].toLowerCase()}`;

  const three = HEX3.exec(trimmed);
  if (three) {
    const [r, g, b] = three[1].toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return null;
}

/** Same as parseCardAccent, but falls back to the brand blue. */
export function normalizeCardAccent(value: unknown): string {
  return parseCardAccent(value) ?? DEFAULT_CARD_THEME;
}

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const DARK_BG: Rgb = { r: 0x15, g: 0x17, b: 0x1f };
const DARK_INK = "#0b1020";

/**
 * Nudges a colour's lightness until it has at least `minRatio` contrast
 * against the given background. This keeps a very pale pick (e.g. white)
 * from disappearing on the white light-mode page, and a very dark pick
 * from disappearing on the dark-mode background. Hue and saturation are
 * preserved, so the result still looks like the colour that was chosen.
 */
function ensureContrast(hex: string, background: Rgb, minRatio: number): string {
  const rgb = hexToRgb(hex);
  if (contrastRatio(rgb, background) >= minRatio) return hex;

  const { h, s, l } = rgbToHsl(rgb);
  const lighten = relativeLuminance(background) < 0.4;
  let next = l;

  for (let i = 0; i < 100; i += 1) {
    next = Math.min(1, Math.max(0, next + (lighten ? 0.02 : -0.02)));
    const candidate = hslToHex(h, s, next);
    if (contrastRatio(hexToRgb(candidate), background) >= minRatio) {
      return candidate;
    }
    if (next === 0 || next === 1) break;
  }

  return hslToHex(h, s, next);
}

/** White or near-black — whichever reads better on the given colour. */
function bestInk(hex: string): string {
  const rgb = hexToRgb(hex);
  const white = contrastRatio(rgb, WHITE);
  const dark = contrastRatio(rgb, hexToRgb(DARK_INK));
  return white >= dark ? "#ffffff" : DARK_INK;
}

export type CardAccentStyle = CSSProperties & {
  "--card-accent": string;
  "--card-accent-dark": string;
  "--card-accent-ink": string;
  "--card-accent-ink-dark": string;
};

/**
 * The inline variables consumed by `[data-card-accent]` in
 * app/globals.css. One picked hex drives the entire primary family:
 *
 *  - light mode uses the colour as-is (darkened only if it would be
 *    unreadable on white),
 *  - dark mode uses a lightened variant so it stays visible on the dark
 *    background,
 *  - the ink variables pick white/near-black text for solid primary
 *    surfaces based on actual contrast.
 */
export function cardAccentStyle(value: unknown): CardAccentStyle {
  const base = normalizeCardAccent(value);
  const lightPrimary = ensureContrast(base, WHITE, 3);
  const darkPrimary = ensureContrast(base, DARK_BG, 3);

  return {
    "--card-accent": lightPrimary,
    "--card-accent-dark": darkPrimary,
    "--card-accent-ink": bestInk(lightPrimary),
    "--card-accent-ink-dark": bestInk(darkPrimary),
  };
}
