"use client";

import { Store, Clock, MapPin, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ContactActions } from "@/components/profile/contact-actions";
import { ShareButton } from "@/components/profile/share-button";
import { SaveContactButton } from "@/components/profile/save-contact-button";
import { SiteFooter } from "@/components/profile/site-footer";
import { useAvatarParallax } from "@/components/profile/use-avatar-parallax";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { trackCardEvent } from "@/lib/analytics/track-client";
import type { PublicCardView, PublicSiteFooter } from "@/types";
import { getCardProfileUrl } from "@/lib/cards/urls";
import { cardAccentStyle } from "@/lib/cards/accent-color";

type ActiveStoreView = Extract<
  PublicCardView,
  { status: "ACTIVE"; type: "STORE_PROFILE" }
>;

/**
 * The public page for a STORE_PROFILE card. Deliberately the same shell
 * as the profile page (avatar animation, contact buttons, link stack,
 * footer) — a store *is* a profile that happens to be a business — with
 * the store-only bits added: category under the name, address and
 * opening hours, and a review button when a review URL is set.
 */
export function StoreProfilePublic({
  view,
  imageUrl,
  footer,
}: {
  view: ActiveStoreView;
  imageUrl: string | null;
  footer: PublicSiteFooter;
}) {
  const t = useTranslations("publicProfile");
  const { store, links, card_id } = view;
  const profileUrl = getCardProfileUrl(card_id);

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

      {/* Same locale model as the profile page: device language on
          first visit, switchable here for the rest of the visit. */}
      <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 pt-4">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      <div className="link-in-bio-panel">
        <div className="panel-grid">
          <div className="profile-column">
            <div
              ref={avatarRef}
              className="avatar-wrapper"
              style={{ transform: "translate3d(0,0,0)" }}
            >
              <div className="avatar-spinning-ring" aria-hidden />
              <div className="avatar-ring">
                <div className="avatar-inner">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={store.full_name}
                      width={260}
                      height={260}
                      loading="eager"
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      <Store className="h-16 w-16" aria-hidden />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <h1
              className="profile-name animate-fade-in-up"
              style={{ animationDelay: "80ms" }}
            >
              {store.full_name}
            </h1>

            {store.category && (
              <p
                className="profile-role animate-fade-in-up"
                style={{ animationDelay: "110ms" }}
              >
                {store.category}
              </p>
            )}

            {store.bio && (
              <p
                className="profile-bio animate-fade-in-up"
                style={{ animationDelay: "140ms" }}
              >
                {store.bio}
              </p>
            )}

            {(store.address || store.opening_hours) && (
              <div
                className="store-meta animate-fade-in-up"
                style={{ animationDelay: "170ms" }}
              >
                {store.address && (
                  <p className="store-meta-line">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    <span>{store.address}</span>
                  </p>
                )}
                {store.opening_hours && (
                  <p className="store-meta-line">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    <span>{store.opening_hours}</span>
                  </p>
                )}
              </div>
            )}

            <div
              className="contact-line animate-fade-in-up"
              style={{ animationDelay: "200ms" }}
            >
              <ContactActions
                cardId={card_id}
                phone={store.phone}
                whatsapp={store.whatsapp}
                email={store.email}
                website={store.website}
                googleMapsUrl={store.google_maps_url}
              />
            </div>

            {store.google_review_url && (
              <a
                href={store.google_review_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCardEvent(card_id, { type: "REVIEW_CLICK" })}
                className="review-button animate-fade-in-up"
                style={{ animationDelay: "220ms" }}
              >
                <Star className="h-4 w-4" aria-hidden />
                {t("leaveReview")}
              </a>
            )}
          </div>

          <div className="links-column">
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
                          linkKind: "store",
                        })
                      }
                      className="link-card animate-fade-in-up"
                      style={{ animationDelay: `${240 + index * 60}ms` }}
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
                  style={{ animationDelay: "240ms" }}
                >
                  <span className="link-card-icon">
                    <Store className="h-6 w-6" />
                  </span>
                  <div className="link-card-content">
                    <h3 className="link-card-title">{t("emptyLinksTitle")}</h3>
                    <p className="link-card-subtitle">
                      {t("emptyLinksSubtitle")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div
              className="action-buttons-row animate-fade-in-up"
              style={{ animationDelay: `${240 + links.length * 60}ms` }}
            >
              <ShareButton
                cardId={card_id}
                url={profileUrl}
                title={store.full_name}
              />
              <SaveContactButton
                cardId={card_id}
                fullName={store.full_name}
                jobTitle={store.category}
                phone={store.phone}
                email={store.email}
                website={store.website}
              />
            </div>

            <SiteFooter
              footer={footer}
              cardId={card_id}
              className="animate-fade-in-up"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
