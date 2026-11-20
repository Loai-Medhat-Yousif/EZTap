import { Phone, Mail, Globe, MapPin, Store, Clock, Star } from "lucide-react";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { cardAccentStyle } from "@/lib/cards/accent-color";
import type { CardTheme } from "@/types";

export type StoreCardPreviewData = {
  theme?: CardTheme;
  fullName: string;
  category?: string | null;
  bio?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
  address?: string | null;
  openingHours?: string | null;
  googleReviewUrl?: string | null;
  imageUrl?: string | null;
  links: Array<{
    id: string;
    icon: string;
    title: string;
    url: string;
    is_active?: boolean;
  }>;
};

/**
 * The admin-side, static preview counterpart to ProfileCardPreview for a
 * store card. Same idea — a read-only mock of the public page — with the
 * store-only fields surfaced (category, address, opening hours) and a
 * review button when a review URL is set.
 */
export function StoreCardPreview({ data }: { data: StoreCardPreviewData }) {
  const activeLinks = data.links.filter((link) => link.is_active !== false);

  const contactButtons = [
    data.phone && { key: "phone", icon: Phone },
    data.whatsapp && { key: "whatsapp", icon: getLinkIcon("whatsapp") },
    data.email && { key: "email", icon: Mail },
    data.website && { key: "website", icon: Globe },
    data.googleMapsUrl && { key: "maps", icon: MapPin },
  ].filter((v): v is { key: string; icon: typeof Phone } => Boolean(v));

  return (
    <div
      data-card-accent
      style={cardAccentStyle(data.theme)}
      className="mx-auto w-full max-w-xs rounded-3xl border border-border bg-surface-raised p-6 text-center"
    >
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
        {data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Store className="h-8 w-8 text-muted" aria-hidden />
        )}
      </div>

      <h3 className="break-words text-base font-semibold text-ink [overflow-wrap:anywhere]">
        {data.fullName || "\u2014"}
      </h3>
      {data.category && (
        <p className="break-words text-sm text-muted [overflow-wrap:anywhere]">{data.category}</p>
      )}
      {data.bio && (
        <p className="mt-3 break-words text-sm text-ink [overflow-wrap:anywhere]">{data.bio}</p>
      )}

      {(data.address || data.openingHours) && (
        <div className="mt-3 space-y-1 text-xs text-muted">
          {data.address && (
            <p className="flex items-start justify-center gap-1.5 text-start">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{data.address}</span>
            </p>
          )}
          {data.openingHours && (
            <p className="flex items-start justify-center gap-1.5 text-start">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{data.openingHours}</span>
            </p>
          )}
        </div>
      )}

      {contactButtons.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {contactButtons.map(({ key, icon: Icon }) => (
            <span
              key={key}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-primary"
            >
              <Icon className="h-4 w-4" />
            </span>
          ))}
        </div>
      )}

      {activeLinks.length > 0 && (
        <div className="mt-4 space-y-2">
          {activeLinks.map((link) => {
            const Icon = getLinkIcon(link.icon);
            return (
              <div
                key={link.id}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-start text-sm text-ink"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.title}</span>
              </div>
            );
          })}
        </div>
      )}

      {data.googleReviewUrl && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-ink">
          <Star className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">Review</span>
        </div>
      )}

      <p className="mt-5 text-[11px] text-muted">Powered by EZTab</p>
    </div>
  );
}
