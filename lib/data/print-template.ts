import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  PRINT_TEMPLATE_KINDS,
  defaultPrintTemplate,
  isPrintTemplateKind,
  type PrintTemplate,
  type PrintTemplateKind,
} from "@/lib/print/template";
import { getPrintDesignPublicUrl } from "@/lib/storage/print-designs";

type PrintTemplateRow = Database["public"]["Tables"]["print_template"]["Row"];

function toTemplate(row: PrintTemplateRow): PrintTemplate | null {
  if (!isPrintTemplateKind(row.kind)) return null;
  return {
    kind: row.kind,
    widthCm: Number(row.width_cm),
    heightCm: Number(row.height_cm),
    designPath: row.design_path,
    cardIdX: Number(row.card_id_x),
    cardIdY: Number(row.card_id_y),
    cardIdFontSize: Number(row.card_id_font_size),
    cardIdColor: row.card_id_color,
    qrX: Number(row.qr_x),
    qrY: Number(row.qr_y),
    qrSize: Number(row.qr_size),
  };
}

/**
 * Every print template, keyed by kind. Falls back to the same defaults
 * the migration seeds, so a fresh/empty project still renders a sensible
 * editor instead of throwing.
 */
export async function getPrintTemplates(): Promise<
  Record<PrintTemplateKind, PrintTemplate>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("print_template").select("*");
  if (error) throw error;

  const templates = {
    profile: defaultPrintTemplate("profile"),
    google_review: defaultPrintTemplate("google_review"),
  } satisfies Record<PrintTemplateKind, PrintTemplate>;

  for (const row of data ?? []) {
    const template = toTemplate(row);
    if (template) templates[template.kind] = template;
  }

  return templates;
}

/** One template by kind, falling back to defaults when no row exists. */
export async function getPrintTemplate(
  kind: PrintTemplateKind,
): Promise<PrintTemplate> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("print_template")
    .select("*")
    .eq("kind", kind)
    .maybeSingle();

  if (error) throw error;
  return data ? (toTemplate(data) ?? defaultPrintTemplate(kind)) : defaultPrintTemplate(kind);
}

/** Convenience: every kind, in the editor's display order. */
export { PRINT_TEMPLATE_KINDS };

/** Public URL of a design, or null when none is set. */
export async function getPrintDesignUrl(
  supabase: SupabaseClient<Database>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  return getPrintDesignPublicUrl(supabase, path);
}
