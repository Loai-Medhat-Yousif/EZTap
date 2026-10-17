import "server-only";
import QRCode from "qrcode";
import { EZTAB_LOGO_DATA_URI } from "@/lib/qr/logo-data-uri";

// Fraction of the QR's total width the logo occupies. High (30%)
// error correction tolerates real-world damage/dirt up to ~30% of the
// code; centered logo coverage well under that (backing square ~30%,
// logo itself ~22%) keeps scanning reliable while staying legible.
// Verified empirically against the `qrcode` package's actual SVG
// output (see Stage 5 notes) rather than assumed.
const LOGO_SIZE_RATIO = 0.22;
const LOGO_BACKING_RATIO = 1.35;

/**
 * Generates a standard black/white QR SVG for the given destination
 * URL, with the EZTab logo centered on a white backing square.
 *
 * The SVG's `viewBox` is in QR *module* units, not pixels, and its
 * size varies with the destination URL's length (more data -> a
 * higher QR version -> more modules) — so the overlay's position and
 * size are computed from the actual generated viewBox, never a
 * hardcoded constant.
 */
export async function buildCardQrSvg(destinationUrl: string): Promise<string> {
  const rawSvg = await QRCode.toString(destinationUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const viewBoxMatch = rawSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!viewBoxMatch) {
    // Defensive: if the qrcode package's output format ever changes,
    // fail loud rather than silently shipping a QR with a misplaced
    // (or missing) logo.
    throw new Error("buildCardQrSvg: could not parse QR viewBox");
  }

  const size = Number(viewBoxMatch[1]);
  const center = size / 2;
  const logoSize = size * LOGO_SIZE_RATIO;
  const backingSize = logoSize * LOGO_BACKING_RATIO;
  const backingOffset = (center - backingSize / 2).toFixed(2);
  const logoOffset = (center - logoSize / 2).toFixed(2);

  const overlay =
    `<rect x="${backingOffset}" y="${backingOffset}" ` +
    `width="${backingSize.toFixed(2)}" height="${backingSize.toFixed(2)}" ` +
    `rx="${(backingSize * 0.18).toFixed(2)}" fill="#15171F"/>` +
    `<image x="${logoOffset}" y="${logoOffset}" ` +
    `width="${logoSize.toFixed(2)}" height="${logoSize.toFixed(2)}" ` +
    `href="${EZTAB_LOGO_DATA_URI}" preserveAspectRatio="xMidYMid meet"/>`;

  return rawSvg.replace("</svg>", `${overlay}</svg>`);
}
