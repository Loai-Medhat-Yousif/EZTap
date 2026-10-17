"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/auth/require-admin";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation/cards";

export type ActionResult = { error?: string };

const NOT_AUTHORIZED: ActionResult = { error: "Not authorized." };

/** Logs the real cause server-side and returns only a safe message. */
function fail(message: string, cause: unknown): ActionResult {
  console.error(`[statistics action] ${message}`, cause);
  return { error: message };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Records one purchase receipt (a batch of blank cards). */
export async function addPurchase(input: PurchaseInput): Promise<ActionResult> {
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the purchase fields.",
    };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const { error } = await supabase.from("card_purchases").insert({
    quantity: parsed.data.quantity,
    total_cost: parsed.data.totalCost,
    purchased_on: parsed.data.purchasedOn,
    note: parsed.data.note ?? null,
  });
  if (error) return fail("Couldn't save the purchase.", error);

  revalidatePath("/admin/statistics");
  return {};
}

export async function deletePurchase(id: string): Promise<ActionResult> {
  if (!UUID_RE.test(id)) return { error: "Purchase not found." };

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const { error } = await supabase.from("card_purchases").delete().eq("id", id);
  if (error) return fail("Couldn't delete the purchase.", error);

  revalidatePath("/admin/statistics");
  return {};
}
