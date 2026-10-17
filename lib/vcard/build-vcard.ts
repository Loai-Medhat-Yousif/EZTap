export type VCardInput = {
  fullName: string;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

/**
 * There's no separate "company" field in the schema (spec section 35's
 * profiles table doesn't have one, only job_title) so ORG is
 * deliberately not emitted — nothing to omit-if-empty, it's just not
 * collected. N (structured name) is left blank rather than
 * best-effort-split from full_name into given/family parts: contact
 * apps display FN (the formatted name) regardless, and guessing at a
 * first/last split would actively misrender names that don't follow
 * that order.
 */
export function buildVCard(input: VCardInput): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCardValue(input.fullName)}`, "N:;;;;"];

  if (input.jobTitle) lines.push(`TITLE:${escapeVCardValue(input.jobTitle)}`);
  if (input.phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(input.phone)}`);
  if (input.email) lines.push(`EMAIL:${escapeVCardValue(input.email)}`);
  if (input.website) lines.push(`URL:${escapeVCardValue(input.website)}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}
