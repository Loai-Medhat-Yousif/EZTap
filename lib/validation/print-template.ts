import { z } from "zod";
import {
  MAX_DIMENSION_CM,
  MIN_DIMENSION_CM,
  PRINT_TEMPLATE_KINDS,
} from "@/lib/print/template";

/**
 * Validates a print-template layout before it's saved. The bounds mirror
 * the database CHECK constraints (and the browser editor's inputs), so a
 * bad value is caught with a readable message here rather than surfacing
 * a raw Postgres error.
 */
export const printTemplateSchema = z.object({
  kind: z.enum(PRINT_TEMPLATE_KINDS as [string, ...string[]]),
  widthCm: z.number().min(MIN_DIMENSION_CM).max(MAX_DIMENSION_CM),
  heightCm: z.number().min(MIN_DIMENSION_CM).max(MAX_DIMENSION_CM),
  cardIdX: z.number().min(0).max(1),
  cardIdY: z.number().min(0).max(1),
  cardIdFontSize: z.number().min(4).max(200),
  cardIdColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #rrggbb colour"),
  qrX: z.number().min(0).max(1),
  qrY: z.number().min(0).max(1),
  qrSize: z.number().min(16).max(400),
});

export type PrintTemplateInput = z.infer<typeof printTemplateSchema>;
