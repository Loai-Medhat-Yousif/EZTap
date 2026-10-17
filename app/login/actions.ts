"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToAdminEmail } from "@/lib/auth/admin-email";
import { isAdminUser } from "@/lib/auth/roles";
import { loginSchema } from "@/lib/validation/auth";
import { getClientIp } from "@/lib/security/client-ip";
import { hashIdentifier, rateLimit } from "@/lib/security/rate-limit";

export type LoginResult = { error: string };

// Per client IP, per 15 minutes. Supabase's own sign-in throttle is
// keyed on the *caller's* IP — and from a Server Action that caller is
// Vercel's shared egress, not the attacker — so it can neither tell
// attackers apart nor protect the one admin account. This does.
const LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_SECONDS = 15 * 60;

export async function login(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a username and password." };
  }

  const ip = getClientIp(await headers());
  const allowed = await rateLimit(
    `login:${hashIdentifier(ip)}`,
    LOGIN_ATTEMPTS,
    LOGIN_WINDOW_SECONDS,
  );
  if (!allowed) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToAdminEmail(parsed.data.username),
    password: parsed.data.password,
  });

  // Deliberately identical message for a wrong username, a wrong
  // password, and a valid non-admin account — don't help an attacker
  // learn which part was right, or that a non-admin account exists.
  const denied = { error: "Incorrect username or password." };

  if (error || !data.user) return denied;

  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();
    return denied;
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
