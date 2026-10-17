"use client";

import { getLinkIcon } from "@/lib/constants/link-icons";
import { trackCardEvent } from "@/lib/analytics/track-client";

export function DynamicLinksList({
  cardId,
  links,
}: {
  cardId: string;
  links: Array<{ id: string; icon: string; title: string; url: string }>;
}) {
  if (links.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      {links.map((link, index) => {
        const Icon = getLinkIcon(link.icon);
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCardEvent(cardId, { type: "LINK_CLICK", linkId: link.id })}
            className="flex animate-fade-in-up items-center gap-3 rounded-2xl border border-border bg-surface-raised px-4 py-3.5 text-start shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
            style={{ animationDelay: `${400 + index * 60}ms` }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-medium text-ink">
              {link.title}
            </span>
          </a>
        );
      })}
    </div>
  );
}
