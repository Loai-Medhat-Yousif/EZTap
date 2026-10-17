import { Phone, Mail, Globe, MapPin, User } from "lucide-react";
import { getLinkIcon } from "@/lib/constants/link-icons";

export type ProfileCardPreviewData = {
  fullName: string;
  jobTitle?: string | null;
  bio?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
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
 * Deliberately simple/static for now — this is Stage 6's admin preview.
 * Stage 7 reuses this same data shape for the actual public page, adding
 * the animation, interactivity (working tel:/mailto:/wa.me links,
 * share, save-contact) and SEO metadata that a preview doesn't need.
 */
export function ProfileCardPreview({ data }: { data: ProfileCardPreviewData }) {
  const activeLinks = data.links.filter((link) => link.is_active !== false);

  const contactButtons = [
    data.phone && { key: "phone", icon: Phone },
    data.whatsapp && { key: "whatsapp", icon: getLinkIcon("whatsapp") },
    data.email && { key: "email", icon: Mail },
    data.website && { key: "website", icon: Globe },
    data.googleMapsUrl && { key: "maps", icon: MapPin },
  ].filter((v): v is { key: string; icon: typeof Phone } => Boolean(v));

  return (
    <div className="mx-auto w-full max-w-xs rounded-3xl border border-border bg-surface-raised p-6 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
        {data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-8 w-8 text-muted" aria-hidden />
        )}
      </div>

      <h3 className="text-base font-semibold text-ink">
        {data.fullName || "\u2014"}
      </h3>
      {data.jobTitle && <p className="text-sm text-muted">{data.jobTitle}</p>}
      {data.bio && <p className="mt-3 text-sm text-ink">{data.bio}</p>}

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

      <p className="mt-5 text-[11px] text-muted">Powered by EZTab</p>
    </div>
  );
}
