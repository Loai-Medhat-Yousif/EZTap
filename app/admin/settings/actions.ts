"use server";

import { getAdminContext } from "@/lib/auth/require-admin";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validation/auth";
import { hashIdentifier, rateLimit } from "@/lib/security/rate-limit";

export type SettingsActionResult = { error?: string };

export async function changePassword(
  input: ChangePasswordInput,
): Promise<SettingsActionResult> {
  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase, user } = context;

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  // Re-verifying the current password is a brute-force oracle if left
  // unlimited (a stolen session could otherwise guess it), so it shares
  // the login limiter's philosophy: few attempts per window.
  const allowed = await rateLimit(
    `pwchange:${hashIdentifier(user.id)}`,
    5,
    15 * 60,
  );
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

  if (!user.email) return { error: "Couldn't verify your account." };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    console.error("[settings] password update failed:", error.message);
    return { error: "Couldn't update the password." };
  }

  return {};
}
