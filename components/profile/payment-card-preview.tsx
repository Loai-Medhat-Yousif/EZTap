import Image from "next/image";
import { Wallet } from "lucide-react";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { cardAccentStyle } from "@/lib/cards/accent-color";
import { cn } from "@/lib/utils";

export type PaymentCardPreviewData = {
  theme: string;
  fullName: string;
  bio: string | null;
  imageUrl: string | null;
  links: Array<{
    id: string;
    icon: string;
    title: string;
    url: string;
    is_active: boolean;
  }>;
};

/**
 * Static admin-side mock of the multiple-payment-methods card. Mirrors
 * ProfileCardPreview: no navigation, analytics, or animation — just a
 * faithful miniature of what the visitor will see.
 */
export function PaymentCardPreview({ data }: { data: PaymentCardPreviewData }) {
  const activeLinks = data.links.filter((link) => link.is_active !== false);

  return (
    <div
      data-card-accent
      style={cardAccentStyle(data.theme)}
      className="mx-auto w-full max-w-xs rounded-3xl border border-border bg-surface-raised p-6 text-center"
    >
      <div
        className={cn(
          "mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-surface",
          !data.imageUrl && "border-dashed",
        )}
      >
        {data.imageUrl ? (
          // Supabase Storage URLs aren't in next.config's image patterns,
          // so the optimizer is skipped here too. `preload` replaces the
          // deprecated Next 16 `priority` prop.
          <Image
            src={data.imageUrl}
            alt=""
            width={80}
            height={80}
            preload
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <Wallet className="h-8 w-8 text-muted" aria-hidden />
        )}
      </div>

      <h3 className="text-base font-semibold text-ink">
        {data.fullName || "\u2014"}
      </h3>
      {data.bio && <p className="mt-3 text-sm text-ink">{data.bio}</p>}

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

      <p className="mt-5 text-[11px] text-muted">Powered by EZTab</p>
    </div>
  );
}
