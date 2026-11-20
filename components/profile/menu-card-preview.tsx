import { Store, Clock, MapPin, Star, UtensilsCrossed, Tag } from "lucide-react";
import { cardAccentStyle } from "@/lib/cards/accent-color";
import type { CardTheme } from "@/types";

export type MenuCardPreviewData = {
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
  categories: Array<{
    id: string;
    name: string;
    is_active: boolean;
    items: Array<{
      id: string;
      name: string;
      price: string | null;
      is_available: boolean;
    }>;
  }>;
  offers: Array<{ id: string; title: string; is_active: boolean }>;
};

export function MenuCardPreview({ data }: { data: MenuCardPreviewData }) {
  const activeCategories = data.categories.filter((c) => c.is_active);
  const activeOffers = data.offers.filter((o) => o.is_active);

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

      <div className="mt-4 space-y-3 text-start">
        {activeOffers.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-ink"><Tag className="h-3.5 w-3.5 shrink-0" /> <span className="min-w-0 break-words">Offers</span></p>
            <p className="text-xs text-muted">{activeOffers.length} active</p>
          </div>
        )}
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-ink"><UtensilsCrossed className="h-3.5 w-3.5 shrink-0" /> <span className="min-w-0 break-words">Menu</span></p>
          {activeCategories.length > 0 ? (
            <div className="space-y-1">
              {activeCategories.slice(0, 4).map((cat) => (
                <div key={cat.id} className="break-words text-xs text-muted [overflow-wrap:anywhere]">
                  <span className="font-medium text-ink">{cat.name}</span>
                  <span> · {cat.items.filter((i) => i.is_available).length} items</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">No categories yet</p>
          )}
        </div>
      </div>

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
