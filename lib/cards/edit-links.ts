import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** How long a customer has to edit, measured from the first time they
 * open the link (not from when the admin created it). */
export const EDIT_LINK_TTL_MINUTES = 30;

const EDIT_LINK_TTL_MS = EDIT_LINK_TTL_MINUTES * 60 * 1000;

/**
 * 32 random bytes, base64url-encoded — a ~43-character, URL-safe token
 * with 256 bits of entropy. Because the token *is* the credential, it
 * has to be long enough that guessing it is hopeless.
 */
export function generateEditToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Only this hash is ever written to `card_edit_links.token_hash`. A
 * plain SHA-256 (not a slow password hash) is deliberate: the input is
 * already high-entropy random, so there is nothing for an attacker to
 * brute-force, and lookups stay a single indexed equality check.
 */
export function hashEditToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function editLinkExpiresAt(from: Date): string {
  return new Date(from.getTime() + EDIT_LINK_TTL_MS).toISOString();
}
