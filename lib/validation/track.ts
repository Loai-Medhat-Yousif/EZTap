import { z } from "zod";

const cardId = z.string().regex(/^[1-9][0-9]{5}$/);
const referrer = z.string().max(500).optional();

/** The only shapes /api/track accepts — LINK_CLICK must carry the link,
 * and nothing else may. */
export const trackEventSchema = z.union([
  z.object({
    cardId,
    type: z.literal("LINK_CLICK"),
    linkId: z.uuid(),
    referrer,
  }),
  z.object({
    cardId,
    type: z.enum([
      "PHONE_CLICK",
      "WHATSAPP_CLICK",
      "EMAIL_CLICK",
      "WEBSITE_CLICK",
      "MAPS_CLICK",
      "SHARE_CLICK",
      "SAVE_CONTACT_CLICK",
    ]),
    referrer,
  }),
]);
