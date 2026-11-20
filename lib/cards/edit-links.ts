import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { type EditDuration, EDIT_DURATIONS } from "@/types";

export { type EditDuration, EDIT_DURATIONS };

export const DURATION_MINUTES: Record<Exclude<EditDuration, "forever">, number> = {
  "30m": 30,
  "1h": 60,
  "1d": 24 * 60,
};

/** Default duration for legacy calls */
export const EDIT_LINK_TTL_MINUTES = 30;

/**
 * 32 random bytes, base64url-encoded, with the selected duration tagged at the end.
 * Example: "<base64url-entropy>.forever" or "<base64url-entropy>.1d"
 */
export function generateEditToken(duration: EditDuration = "forever"): string {
  const bytes = randomBytes(32).toString("base64url");
  return `${bytes}.${duration}`;
}

export function parseEditToken(token: string): { duration: EditDuration } {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex !== -1) {
    const dur = token.slice(dotIndex + 1);
    if (dur === "forever" || dur === "1d" || dur === "1h" || dur === "30m") {
      return { duration: dur };
    }
  }
  return { duration: "30m" };
}

/**
 * Only this hash is ever written to `card_edit_links.token_hash`.
 */
export function hashEditToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function editLinkExpiresAt(
  from: Date,
  duration: EditDuration = "forever",
): string | null {
  if (duration === "forever") return null;
  const minutes = DURATION_MINUTES[duration];
  if (!minutes) return null;
  return new Date(from.getTime() + minutes * 60 * 1000).toISOString();
}
