"use client";

import { useState } from "react";
import { Store, Clock, MapPin, Star, Tag, UtensilsCrossed } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ContactActions } from "@/components/profile/contact-actions";
import { ShareButton } from "@/components/profile/share-button";
import { SaveContactButton } from "@/components/profile/save-contact-button";
import { SiteFooter } from "@/components/profile/site-footer";
import { useAvatarParallax } from "@/components/profile/use-avatar-parallax";
import { trackCardEvent } from "@/lib/analytics/track-client";
import type {
  ActiveMenuView,
  PublicMenuCategory,
  PublicMenuItem,
  PublicMenuOffer,
  PublicSiteFooter,
} from "@/types";
import { getCardProfileUrl } from "@/lib/cards/urls";
import { cardAccentStyle } from "@/lib/cards/accent-color";
import { formatMenuPrice } from "@/lib/cards/menu-price";
import { cn } from "@/lib/utils";

type MenuItemWithUrl = PublicMenuItem & { imageUrl: string | null };
type MenuCategoryWithUrls = Omit<PublicMenuCategory, "items"> & {
  items: MenuItemWithUrl[];
};
type MenuOfferWithUrl = PublicMenuOffer & { imageUrl: string | null };

function isDiscountActive(item: PublicMenuItem, now: number): boolean {
  const hasDiscount =
    (item.discount_label && item.discount_label.trim().length > 0) ||
    (item.discount_price && item.discount_price.trim().length > 0);
  if (!hasDiscount) return false;
  const start = item.discount_starts_at ? Date.parse(item.discount_starts_at) : null;
  const end = item.discount_ends_at ? Date.parse(item.discount_ends_at) : null;
  if (start !== null && !Number.isNaN(start) && now < start) return false;
  if (end !== null && !Number.isNaN(end) && now >= end) return false;
  return true;
}

export function MenuProfilePublic({
  view,
  imageUrl,
  footer,
  categories,
  offers,
}: {
  view: ActiveMenuView;
  imageUrl: string | null;
  footer: PublicSiteFooter;
  categories: MenuCategoryWithUrls[];
  offers: MenuOfferWithUrl[];
}) {
  const t = useTranslations("publicProfile");
  const locale = useLocale();
  const { menu, card_id } = view;
  const profileUrl = getCardProfileUrl(card_id);
  const avatarRef = useAvatarParallax<HTMLDivElement>();
  const [now] = useState(() => Date.now());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const visibleCategories = selectedCategoryId
    ? categories.filter((category) => category.id === selectedCategoryId)
    : categories;

  function offerEndLabel(offer: PublicMenuOffer): string | null {
    if (!offer.ends_at) return null;
    const end = new Date(offer.ends_at);
    if (Number.isNaN(end.getTime())) return null;
    const date = end.toLocaleDateString(
      locale === "ar" ? "ar-EG" : locale,
      { dateStyle: "medium" },
    );
    return `${t("menuOfferEndsAt")} ${date}`;
  }

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
                      alt={menu.full_name}
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
              {menu.full_name}
            </h1>

            {menu.category && (
              <p
                className="profile-role animate-fade-in-up"
                style={{ animationDelay: "110ms" }}
              >
                {menu.category}
              </p>
            )}

            {menu.bio && (
              <p
                className="profile-bio animate-fade-in-up"
                style={{ animationDelay: "140ms" }}
              >
                {menu.bio}
              </p>
            )}

            {(menu.address || menu.opening_hours) && (
              <div
                className="store-meta animate-fade-in-up"
                style={{ animationDelay: "170ms" }}
              >
                {menu.address && (
                  <p className="store-meta-line">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    <span>{menu.address}</span>
                  </p>
                )}
                {menu.opening_hours && (
                  <p className="store-meta-line">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    <span>{menu.opening_hours}</span>
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
                phone={menu.phone}
                whatsapp={menu.whatsapp}
                email={menu.email}
                website={menu.website}
                googleMapsUrl={menu.google_maps_url}
              />
            </div>

            {menu.google_review_url && (
              <a
                href={menu.google_review_url}
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
            {offers.length > 0 && (
              <section className="animate-fade-in-up space-y-3" style={{ animationDelay: "240ms" }}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Tag className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">{t("menuOffersTitle")}</span>
                </h2>
                <div className="space-y-3">
                  {offers.map((offer) => {
                    const windowLabel = offerEndLabel(offer);
                    const offerPrice = formatMenuPrice(offer.price_text);
                    return (
                      <article
                        key={offer.id}
                        className="overflow-hidden rounded-2xl border border-border bg-surface-raised"
                      >
                        {offer.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={offer.imageUrl}
                            alt={offer.title}
                            className="h-36 w-full object-cover sm:h-40"
                            loading="lazy"
                          />
                        )}
                        <div className="space-y-1.5 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                            <h3 className="min-w-0 flex-1 break-words font-semibold text-ink [overflow-wrap:anywhere]">
                              {offer.title}
                            </h3>
                            {offerPrice && (
                              <span className="max-w-full shrink-0 rounded-full bg-[var(--card-accent-soft,#dbeafe)] px-2 py-0.5 text-xs font-semibold text-[var(--card-accent,#2563eb)] break-words [overflow-wrap:anywhere] sm:max-w-[45%]">
                                {offerPrice}
                              </span>
                            )}
                          </div>
                          {offer.description && (
                            <p className="break-words text-sm text-muted [overflow-wrap:anywhere]">
                              {offer.description}
                            </p>
                          )}
                          {windowLabel && (
                            <p className="break-words text-xs text-muted [overflow-wrap:anywhere]">
                              {windowLabel}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section
              className="animate-fade-in-up space-y-4"
              style={{ animationDelay: offers.length > 0 ? "300ms" : "240ms" }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <UtensilsCrossed className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{t("menuTitle")}</span>
              </h2>
              {categories.length > 0 && (
                <div
                  className="-mx-1 flex flex-wrap gap-2 px-1"
                  role="group"
                  aria-label={t("menuTitle")}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    aria-pressed={selectedCategoryId === null}
                    className={cn(
                      "max-w-full rounded-full border px-3 py-1 text-xs font-semibold transition-colors [overflow-wrap:anywhere]",
                      selectedCategoryId === null
                        ? "border-[var(--card-accent,#2563eb)] bg-transparent text-[var(--card-accent,#2563eb)]"
                        : "border-border bg-transparent text-muted hover:text-ink",
                    )}
                  >
                    {t("menuAllCategories")}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      aria-pressed={selectedCategoryId === category.id}
                      className={cn(
                        "max-w-full rounded-full border px-3 py-1 text-xs font-semibold transition-colors [overflow-wrap:anywhere]",
                        selectedCategoryId === category.id
                          ? "border-[var(--card-accent,#2563eb)] bg-transparent text-[var(--card-accent,#2563eb)]"
                          : "border-border bg-transparent text-muted hover:text-ink",
                      )}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
              {visibleCategories.length > 0 ? (
                <div className="space-y-5">
                  {visibleCategories.map((cat) => (
                    <div key={cat.id} className="space-y-2">
                      <h3 className="break-words text-xs font-semibold uppercase tracking-wide text-muted [overflow-wrap:anywhere]">
                        {cat.name}
                      </h3>
                      <div className="space-y-2">
                        {cat.items.map((item) => {
                          const discounted = isDiscountActive(item, now);
                          const price = formatMenuPrice(item.price);
                          const discountPrice = formatMenuPrice(item.discount_price);
                          return (
                            <article
                              key={item.id}
                              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-3 sm:flex-row"
                            >
                              {item.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-32 w-full shrink-0 rounded-xl object-cover sm:h-16 sm:w-16"
                                  loading="lazy"
                                />
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                                  <h4 className="min-w-0 flex-1 break-words font-medium text-ink [overflow-wrap:anywhere]">
                                    {item.name}
                                  </h4>
                                  <div className="max-w-full text-end [overflow-wrap:anywhere] sm:max-w-[45%] sm:shrink-0">
                                    {discounted && discountPrice ? (
                                      <>
                                        <span className="block break-words text-sm font-semibold text-[var(--card-accent,#2563eb)]">
                                          {discountPrice}
                                        </span>
                                        {price && (
                                          <span className="block break-words text-xs text-muted line-through">
                                            {price}
                                          </span>
                                        )}
                                      </>
                                    ) : price ? (
                                      <span className="block break-words text-sm font-medium text-ink">
                                        {price}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                {item.description && (
                                  <p className="break-words text-sm text-muted [overflow-wrap:anywhere]">
                                    {item.description}
                                  </p>
                                )}
                                {discounted && item.discount_label && (
                                  <span className="inline-flex max-w-full break-words rounded-full bg-[var(--card-accent-soft,#dbeafe)] px-2 py-0.5 text-[11px] font-semibold text-[var(--card-accent,#2563eb)] [overflow-wrap:anywhere]">
                                    {item.discount_label}
                                  </span>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
                  {t("menuEmpty")}
                </div>
              )}
            </section>

            <div
              className="action-buttons-row animate-fade-in-up"
              style={{ animationDelay: "360ms" }}
            >
              <ShareButton cardId={card_id} url={profileUrl} title={menu.full_name} />
              <SaveContactButton
                cardId={card_id}
                fullName={menu.full_name}
                jobTitle={menu.category}
                phone={menu.phone}
                email={menu.email}
                website={menu.website}
              />
            </div>

            <SiteFooter footer={footer} cardId={card_id} className="animate-fade-in-up" />
          </div>
        </div>
      </div>
    </main>
  );
}
