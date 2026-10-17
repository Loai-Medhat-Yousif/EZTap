"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/auth/require-admin";
import {
  printTemplateSchema,
  type PrintTemplateInput,
} from "@/lib/validation/print-template";
import { isPrintTemplateKind } from "@/lib/print/template";
import {
  MAX_PRINT_DESIGN_BYTES,
  deletePrintDesign,
  getPrintDesignPublicUrl,
  uploadPrintDesign,
} from "@/lib/storage/print-designs";

export type ActionResult = { error?: string };

const NOT_AUTHORIZED: ActionResult = { error: "Not authorized." };

function fail(message: string, cause: unknown): ActionResult {
  console.error(`[print-template action] ${message}`, cause);
  return { error: message };
}

const PATHS = ["/admin/print-template"] as const;

/** Saves one template's page size and card ID / QR positions and sizes. */
export async function savePrintTemplate(
  input: PrintTemplateInput,
): Promise<ActionResult> {
  const parsed = printTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the layout values.",
    };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const patch = {
    width_cm: parsed.data.widthCm,
    height_cm: parsed.data.heightCm,
    card_id_x: parsed.data.cardIdX,
    card_id_y: parsed.data.cardIdY,
    card_id_font_size: parsed.data.cardIdFontSize,
    card_id_color: parsed.data.cardIdColor,
    qr_x: parsed.data.qrX,
    qr_y: parsed.data.qrY,
    qr_size: parsed.data.qrSize,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("print_template")
    .update(patch)
    .eq("kind", parsed.data.kind);
  if (error) return fail("Couldn't save the print layout.", error);

  for (const path of PATHS) revalidatePath(path);
  return {};
}

/**
 * Replaces one template's design image. The previous object is deleted
 * only after the new one is stored, so a failed upload never leaves the
 * template pointing at nothing.
 */
export async function uploadPrintDesignAction(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const context = await getAdminContext();
  if (!context) return { error: "Not authorized." };
  const { supabase } = context;

  const kind = formData.get("kind");
  if (!isPrintTemplateKind(kind)) {
    return { error: "Unknown print template." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (file.size > MAX_PRINT_DESIGN_BYTES) {
    return { error: "Design is too large (max 10MB)." };
  }

  const { data: current } = await supabase
    .from("print_template")
    .select("design_path")
    .eq("kind", kind)
    .maybeSingle();

  const result = await uploadPrintDesign(supabase, file, kind);
  if ("error" in result) {
    return {
      error:
        result.error === "type"
          ? "Use a PNG or JPEG image."
          : "That image is too large (max 10MB).",
    };
  }

  const { error } = await supabase
    .from("print_template")
    .update({ design_path: result.path, updated_at: new Date().toISOString() })
    .eq("kind", kind);

  if (error) {
    // Roll back the orphaned upload so a failed save doesn't leak it.
    await deletePrintDesign(supabase, result.path).catch(() => {});
    return fail("Couldn't save the design.", error);
  }

  if (current?.design_path && current.design_path !== result.path) {
    await deletePrintDesign(supabase, current.design_path).catch(() => {});
  }

  for (const path of PATHS) revalidatePath(path);
  return { url: getPrintDesignPublicUrl(supabase, result.path) };
}

export async function removePrintDesignAction(
  kind: string,
): Promise<ActionResult> {
  if (!isPrintTemplateKind(kind)) {
    return { error: "Unknown print template." };
  }

  const context = await getAdminContext();
  if (!context) return NOT_AUTHORIZED;
  const { supabase } = context;

  const { data: current } = await supabase
    .from("print_template")
    .select("design_path")
    .eq("kind", kind)
    .maybeSingle();

  const { error } = await supabase
    .from("print_template")
    .update({ design_path: null, updated_at: new Date().toISOString() })
    .eq("kind", kind);
  if (error) return fail("Couldn't remove the design.", error);

  if (current?.design_path) {
    await deletePrintDesign(supabase, current.design_path).catch(() => {});
  }

  for (const path of PATHS) revalidatePath(path);
  return {};
}
