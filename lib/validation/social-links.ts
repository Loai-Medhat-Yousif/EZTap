import { z } from "zod";
import { httpUrlSchema, optionalUrl } from "@/lib/validation/cards";

/**
 * A single footer social link (the circles beside "Powered by EZTab").
 * `icon` is a key in lib/constants/link-icons.ts; the same registry used
 * for card links, so the icon picker and renderer are shared.
 */
export const socialLinkSchema = z.object({
  icon: z.string().min(1, "Choose an icon"),
  label: z
    .string()
    .trim()
    .min(1, "Enter a label")
    .max(60, "Label is too long"),
  url: httpUrlSchema,
});
export type SocialLinkInput = z.infer<typeof socialLinkSchema>;

/** The one global setting the footer needs today. */
export const siteSettingsSchema = z.object({
  makeYourOwnUrl: optionalUrl().optional(),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
