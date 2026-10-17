"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  profileDetailsSchema,
  profileLinkSchema,
  type ProfileDetailsInput,
  type ProfileLinkInput,
} from "@/lib/validation/cards";
import * as cardMutations from "@/lib/cards/mutations";
import {
  resolveEditSession,
  closeEditSession,
  type EditSession,
} from "@/lib/cards/edit-session";
import { hashIdentifier, rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";

export type EditActionResult = { error?: string };

/**
 * Customer-facing edit actions. Authorization is the token itself:
 * resolveEditSession() maps it to one card and hands back a service-role
 * client scoped to that card, and every link mutation re-checks the
 * profile, so a forged link id can't reach another card. Rate limiting
 * is keyed on the (hashed) client IP plus the token, so one abusive
 * visitor can't churn a card's data.
 */
async function authorize(action: string, token: string): Promise<EditSession> {
  const requestHeaders = await headers();
  const key = hashIdentifier(
    `edit:${action}:${getClientIp(requestHeaders)}:${token.slice(0, 16)}`,
  );
  const allowed = await rateLimit(key, 90, 60);
  if (!allowed) {
    return { error: "Too many changes at once. Please wait a moment." };
  }
  return resolveEditSession(token);
}

function refresh(token: string): void {
  revalidatePath(`/edit/${token}`);
}

export async function editUpdateProfileDetails(
  token: string,
  input: ProfileDetailsInput,
): Promise<EditActionResult> {
  const parsed = profileDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const session = await authorize("profile", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveProfileDetails(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUploadProfileImage(
  token: string,
  formData: FormData,
): Promise<EditActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  const session = await authorize("photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.saveProfileImage(
    session.supabase,
    session.cardUuid,
    file,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editRemoveProfileImage(
  token: string,
): Promise<EditActionResult> {
  const session = await authorize("photo", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.removeProfileImage(
    session.supabase,
    session.cardUuid,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editAddProfileLink(
  token: string,
  input: ProfileLinkInput,
): Promise<EditActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.insertProfileLink(
    session.supabase,
    session.cardUuid,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editUpdateProfileLink(
  token: string,
  linkId: string,
  input: ProfileLinkInput,
): Promise<EditActionResult> {
  const parsed = profileLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link fields." };
  }
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.updateProfileLink(
    session.supabase,
    session.cardUuid,
    linkId,
    parsed.data,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editDeleteProfileLink(
  token: string,
  linkId: string,
): Promise<EditActionResult> {
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.deleteProfileLink(
    session.supabase,
    session.cardUuid,
    linkId,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editSetProfileLinkActive(
  token: string,
  linkId: string,
  isActive: boolean,
): Promise<EditActionResult> {
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.setProfileLinkActive(
    session.supabase,
    session.cardUuid,
    linkId,
    isActive,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

export async function editMoveProfileLink(
  token: string,
  linkId: string,
  direction: "up" | "down",
): Promise<EditActionResult> {
  const session = await authorize("link", token);
  if ("error" in session) return { error: session.error };

  const result = await cardMutations.moveProfileLink(
    session.supabase,
    session.cardUuid,
    linkId,
    direction,
  );
  if (result.error) return result;

  refresh(token);
  return {};
}

/** The customer's "save and close" — ends the edit window. */
export async function editSaveAndClose(token: string): Promise<EditActionResult> {
  return closeEditSession(token);
}
