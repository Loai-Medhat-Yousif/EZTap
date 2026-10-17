import { z } from "zod";

/**
 * A URL that's actually safe to store as a redirect/link target: must
 * parse, and must be http/https specifically — rejects `javascript:`,
 * `data:`, and anything else that could turn a "visit this link"
 * button into script execution (spec section 34: validate URLs,
 * prevent malicious javascript URLs, secure redirects).
 */
/**
 * Normalises a user-typed URL into an absolute http(s) URL, or null when
 * it can't be one. A bare `www.example.com` (or `example.com`) gets an
 * `https://` scheme, so pasting a link without a protocol is accepted and
 * stored as something the "visit link" button can actually open.
 */
function toAbsoluteHttpUrl(value: string): string | null {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export const httpUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter a URL")
  .max(2048, "URL is too long")
  .refine((value) => toAbsoluteHttpUrl(value) !== null, {
    message: "Enter a valid URL starting with http:// or https://",
  })
  .transform((value) => toAbsoluteHttpUrl(value) ?? value);

function optionalTrimmed(max: number) {
  return z
    .string()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));
}

function optionalUrl() {
  return z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
    .refine((v) => v === undefined || httpUrlSchema.safeParse(v).success, {
      message: "Enter a valid URL starting with http:// or https://",
    });
}

function optionalEmail() {
  return z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
    .refine((v) => v === undefined || z.email().safeParse(v).success, {
      message: "Enter a valid email address",
    });
}

function optionalPhone() {
  return z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
    .refine((v) => v === undefined || /^[+()\d\s-]{4,20}$/.test(v), {
      message: "Enter a valid phone number",
    });
}

export const profileDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(120, "Name is too long"),
  jobTitle: optionalTrimmed(120),
  bio: optionalTrimmed(500),
  phone: optionalPhone(),
  whatsapp: optionalPhone(),
  email: optionalEmail(),
  website: optionalUrl().optional(),
  googleMapsUrl: optionalUrl().optional(),
});
// The schema's OUTPUT type (after the optional-field transforms) — what
// a Server Action receives once validation has run.
export type ProfileDetailsInput = z.infer<typeof profileDetailsSchema>;
// The schema's INPUT type — what react-hook-form actually holds and
// submits (all the optional fields are plain possibly-empty strings
// before the schema transforms them). zodResolver's own type signature
// is `Resolver<z.input<T>, Context, z.output<T>>`, so this is what
// `useForm`'s field-values generic must be, not the inferred/output type.
export type ProfileDetailsFormInput = z.input<typeof profileDetailsSchema>;

export const googleReviewDetailsSchema = z.object({
  googleReviewUrl: httpUrlSchema,
});
export type GoogleReviewDetailsInput = z.infer<typeof googleReviewDetailsSchema>;

export const createCardSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PROFILE") }).extend(profileDetailsSchema.shape),
  z
    .object({ type: z.literal("GOOGLE_REVIEW") })
    .extend(googleReviewDetailsSchema.shape),
]);
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const cardListFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  type: z.enum(["ALL", "PROFILE", "GOOGLE_REVIEW"]).default("ALL"),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
});
export type CardListFilters = z.infer<typeof cardListFiltersSchema>;

export const profileLinkSchema = z.object({
  icon: z.string().min(1, "Choose an icon"),
  title: z.string().trim().min(1, "Enter a label").max(80, "Label is too long"),
  url: httpUrlSchema,
});
export type ProfileLinkInput = z.infer<typeof profileLinkSchema>;

/**
 * Recording a sale. `priceEgp` is nullable because a card can be marked
 * sold with its price left blank; the client sends the field cleared to
 * null rather than an empty string. There is no upper EGP ceiling in
 * reality, but 9,999,999.99 matches the `numeric(10,2)` column's range
 * with room to spare.
 */
export const cardSaleSchema = z.object({
  sold: z.boolean(),
  priceEgp: z
    .number()
    .nonnegative("Price can't be negative")
    .max(9999999.99, "Price is too large")
    .nullable(),
});
export type CardSaleInput = z.infer<typeof cardSaleSchema>;

/**
 * Recording a batch of blank cards bought. `purchasedOn` is a plain
 * ISO date (`YYYY-MM-DD`) straight from a date input; `note` is
 * optional and trimmed to nothing when blank.
 */
export const purchaseSchema = z.object({
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Enter how many cards")
    .max(1000000, "Quantity is too large"),
  totalCost: z
    .number()
    .nonnegative("Cost can't be negative")
    .max(9999999.99, "Cost is too large"),
  purchasedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  note: z
    .string()
    .max(200, "Note is too long")
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;
