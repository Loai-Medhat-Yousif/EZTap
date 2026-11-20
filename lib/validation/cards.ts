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

export { optionalUrl };

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

/**
 * The single field every "scan -> straight redirect" card type
 * (GOOGLE_REVIEW, INSTAPAY, ONLINE_CASH) stores: the external URL the
 * tag sends the visitor to. Same shape and validation for all three.
 */
export const targetUrlSchema = z.object({
  targetUrl: httpUrlSchema,
});
export type TargetUrlInput = z.infer<typeof targetUrlSchema>;

/**
 * The store page's fields. It reuses every personal-profile field that
 * fits a store (name, bio, phone, whatsapp, email, website, maps) and
 * adds the store-only ones (category, address, opening hours) plus the
 * "leave us a review" target. `fullName` is the store's name.
 */
export const storeDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(120, "Name is too long"),
  category: optionalTrimmed(80),
  bio: optionalTrimmed(500),
  phone: optionalPhone(),
  whatsapp: optionalPhone(),
  email: optionalEmail(),
  website: optionalUrl().optional(),
  googleMapsUrl: optionalUrl().optional(),
  address: optionalTrimmed(240),
  openingHours: optionalTrimmed(240),
  googleReviewUrl: optionalUrl().optional(),
});
export type StoreDetailsInput = z.infer<typeof storeDetailsSchema>;
export type StoreDetailsFormInput = z.input<typeof storeDetailsSchema>;

/**
 * The multiple-payment-methods page's own fields: a name, a short bio and
 * (separately managed) a list of payment links. It has none of the contact
 * channels a personal profile or store has — the whole point of the card
 * is the collection of payment methods.
 */
export const paymentDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(120, "Name is too long"),
  bio: optionalTrimmed(500),
});
export type PaymentDetailsInput = z.infer<typeof paymentDetailsSchema>;
export type PaymentDetailsFormInput = z.input<typeof paymentDetailsSchema>;

/**
 * The menu page's base info — same fields as a full store page. The menu
 * structure itself (categories, items, offers) is managed separately.
 */
export const menuDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(120, "Name is too long"),
  category: optionalTrimmed(80),
  bio: optionalTrimmed(500),
  phone: optionalPhone(),
  whatsapp: optionalPhone(),
  email: optionalEmail(),
  website: optionalUrl().optional(),
  googleMapsUrl: optionalUrl().optional(),
  address: optionalTrimmed(240),
  openingHours: optionalTrimmed(240),
  googleReviewUrl: optionalUrl().optional(),
});
export type MenuDetailsInput = z.infer<typeof menuDetailsSchema>;
export type MenuDetailsFormInput = z.input<typeof menuDetailsSchema>;

function optionalDateTime() {
  return z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), {
      message: "Enter a valid date and time",
    });
}

export const menuCategorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120, "Name is too long"),
  isActive: z.boolean().default(true),
});
export type MenuCategoryInput = z.infer<typeof menuCategorySchema>;

export const menuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter a name").max(120, "Name is too long"),
  description: optionalTrimmed(500),
  price: optionalTrimmed(80),
  isAvailable: z.boolean().default(true),
  discountLabel: optionalTrimmed(80),
  discountPrice: optionalTrimmed(80),
  discountStartsAt: optionalDateTime(),
  discountEndsAt: optionalDateTime(),
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const menuOfferSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(120, "Title is too long"),
  description: optionalTrimmed(500),
  priceText: optionalTrimmed(80),
  startsAt: optionalDateTime(),
  endsAt: optionalDateTime(),
  isActive: z.boolean().default(true),
});
export type MenuOfferInput = z.infer<typeof menuOfferSchema>;

export const createCardSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PROFILE") }).extend(profileDetailsSchema.shape),
  z.object({ type: z.literal("GOOGLE_REVIEW") }).extend(targetUrlSchema.shape),
  z.object({ type: z.literal("INSTAPAY") }).extend(targetUrlSchema.shape),
  z.object({ type: z.literal("ONLINE_CASH") }).extend(targetUrlSchema.shape),
  z.object({ type: z.literal("STORE_PROFILE") }).extend(storeDetailsSchema.shape),
  z.object({ type: z.literal("MULTIPLE_PAYMENT_METHODS") }).extend(paymentDetailsSchema.shape),
  z.object({ type: z.literal("MENU") }).extend(menuDetailsSchema.shape),
]);
export type CreateCardInput = z.infer<typeof createCardSchema>;

/**
 * The accent colour of a card's public page: any `#rrggbb` hex value.
 * Normalised to lowercase so the stored value and the CSS variable are
 * always the same string. Server Actions are public endpoints, so the
 * regex is the actual write barrier — not just the picker's UI.
 */
export const cardThemeSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #005CF2.")
  .transform((value) => value.toLowerCase());
export type CardThemeInput = z.infer<typeof cardThemeSchema>;

export const cardListFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  type: z
    .enum([
      "ALL",
      "PROFILE",
      "GOOGLE_REVIEW",
      "INSTAPAY",
      "ONLINE_CASH",
      "STORE_PROFILE",
      "MULTIPLE_PAYMENT_METHODS",
      "MENU",
    ])
    .default("ALL"),
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
