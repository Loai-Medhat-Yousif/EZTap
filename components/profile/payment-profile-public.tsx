"use client";

import Image from "next/image";
import { Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { SiteFooter } from "@/components/profile/site-footer";
import { useAvatarParallax } from "@/components/profile/use-avatar-parallax";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { trackCardEvent } from "@/lib/analytics/track-client";
import type { ActivePaymentView, PublicSiteFooter } from "@/types";
import { cardAccentStyle } from "@/lib/cards/accent-color";

/**
 * The public page for a MULTIPLE_PAYMENT_METHODS card. Same visual shell as
 * the profile/store pages (accent theming, animated avatar, link stack,
 * footer) but with all the profile-only contact actions removed — a visitor
 * only needs the payment links and the owner's name/logo.
 */
export function PaymentProfilePublic({
  view,
  imageUrl,
  footer,
}: {
  view: ActivePaymentView;
  imageUrl: string | null;
  footer: PublicSiteFooter;
}) {
  const t = useTranslations("publicProfile");
  const { payment, links, card_id } = view;

  const avatarRef = useAvatarParallax<HTMLDivElement>();

  return (
    <main
      className="link-in-bio-main"
      data-card-accent
      style={cardAccentStyle(view.theme)}
    >
      <div className="link-in-bio-background">
        <div className="wave-top" />
        <div className="wave-bottom" />
        <svg
          className="wave-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 1200"
          preserveAspectRatio="none"
        >
          <path d="M0,600 C300,800 600,400 1200,600 L1200,1200 L0,1200 Z" />
        </svg>
      </div>

      {/* Same locale model as the other public pages: the device language
          seeds the cookie on first visit, and these switches let the
          visitor override it without changing the printed card URL. */}
      <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 pt-4">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      <div className="link-in-bio-panel">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center">
          <div
            ref={avatarRef}
            className="avatar-wrapper"
            style={{ transform: "translate3d(0,0,0)" }}
          >
            <div className="avatar-spinning-ring" aria-hidden />
            <div className="avatar-ring">
              <div className="avatar-inner">
                {imageUrl ? (
                  // Supabase Storage URLs aren't in next.config's image
                  // patterns, so skip the optimizer rather than fail at
                  // runtime. `preload` keeps this above-the-fold image as
                  // the LCP candidate (Next 16 replaced `priority`).
                  <Image
                    src={imageUrl}
                    alt={payment.full_name}
                    fill
                    sizes="(max-width: 640px) 200px, 260px"
                    preload
                    unoptimized
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    <Wallet className="h-16 w-16" aria-hidden />
                  </div>
                )}
              </div>
            </div>
          </div>

          <h1
            className="profile-name animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            {payment.full_name}
          </h1>

          {payment.bio && (
            <p
              className="profile-bio animate-fade-in-up"
              style={{ animationDelay: "140ms" }}
            >
              {payment.bio}
            </p>
          )}

          <section
            className="mt-10 w-full animate-fade-in-up space-y-4"
            style={{ animationDelay: "200ms" }}
            aria-labelledby="payment-methods-title"
          >
            <div className="border-s-4 border-primary ps-3 text-start">
              <h2
                id="payment-methods-title"
                className="text-lg font-semibold text-ink"
              >
                {t("paymentMethodsTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("paymentMethodsSubtitle")}
              </p>
            </div>

            <div className="link-cards-stack">
              {links.length > 0 ? (
                links.map((link, index) => {
                  const Icon = getLinkIcon(link.icon);
                  let host = link.url;
                  try {
                    host = new URL(link.url).hostname;
                  } catch {
                    host = link.url;
                  }
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackCardEvent(card_id, {
                          type: "LINK_CLICK",
                          linkId: link.id,
                          linkKind: "payment",
                        })
                      }
                      className="link-card animate-fade-in-up"
                      style={{ animationDelay: `${260 + index * 60}ms` }}
                    >
                      <span className="link-card-icon">
                        <Icon className="h-6 w-6" />
                      </span>
                      <div className="link-card-content">
                        <h3 className="link-card-title">{link.title}</h3>
                        <p className="link-card-subtitle">{host}</p>
                      </div>
                    </a>
                  );
                })
              ) : (
                <div
                  className="link-card placeholder animate-fade-in-up"
                  style={{ animationDelay: "260ms" }}
                >
                  <span className="link-card-icon">
                    <Wallet className="h-6 w-6" />
                  </span>
                  <div className="link-card-content">
                    <h3 className="link-card-title">
                      {t("emptyLinksTitle")}
                    </h3>
                    <p className="link-card-subtitle">
                      {t("emptyLinksSubtitle")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <SiteFooter
            footer={footer}
            cardId={card_id}
            className="mt-8 w-full animate-fade-in-up"
          />
        </div>
      </div>
    </main>
  );
}
