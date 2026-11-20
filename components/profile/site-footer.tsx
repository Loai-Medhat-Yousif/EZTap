"use client";

import { useTranslations } from "next-intl";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { getCardProfileUrl } from "@/lib/cards/urls";
import { cn } from "@/lib/utils";
import type { PublicSiteFooter } from "@/types";

/**
 * The global footer shown at the bottom of every public card page: the
 * "Powered by EZTab" credit, then the admin-configured EZTab social
 * links as small muted circles, then the bilingual "Want to make your
 * own?" call to action. The credit leads so the links below it read as
 * EZTab's own external presence rather than part of this card.
 *
 * The circles are read-only here; which links exist, their order, and
 * where "make your own" points are all set in Admin → Settings. The
 * `cardId` is only used to build the shareable profile URL the "make
 * your own" link defaults to when no custom URL is configured.
 */
export function SiteFooter({
  footer,
  cardId,
  className,
}: {
  footer: PublicSiteFooter;
  cardId: string;
  className?: string;
}) {
  const t = useTranslations("publicProfile");
  const links = footer.social_links ?? [];
  const makeYourOwnHref = footer.make_your_own_url ?? getCardProfileUrl(cardId);

  return (
    <div className={cn("site-footer", className)}>
      {/* The credit leads so the links under it read as EZTab's own
          external presence, not as part of this card. */}
      <p className="footer-credit">{t("poweredBy")}</p>

      {links.length > 0 && (
        <div className="site-social-circles">
          {links.map((link) => {
            const Icon = getLinkIcon(link.icon);
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                title={link.label}
                className="social-circle"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            );
          })}
        </div>
      )}

      {/* Always both languages, English then Arabic, in either locale —
          `dir="ltr"` keeps that reading order stable when the page itself
          is RTL, and the `lang` spans let a screen reader switch voice. */}
      <a
        href={makeYourOwnHref}
        target="_blank"
        rel="noopener noreferrer"
        className="footer-make-own"
        dir="ltr"
      >
        <span lang="en">{t("makeYourOwnEn")}</span>
        <span aria-hidden="true"> · </span>
        <span lang="ar">{t("makeYourOwnAr")}</span>
      </a>
    </div>
  );
}
