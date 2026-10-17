"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { ContactActions } from "@/components/profile/contact-actions";
import { ShareButton } from "@/components/profile/share-button";
import { SaveContactButton } from "@/components/profile/save-contact-button";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { trackCardEvent } from "@/lib/analytics/track-client";
import type { PublicCardView } from "@/types";
import { getCardProfileUrl } from "@/lib/cards/urls";

type ActiveProfileView = Extract<
  PublicCardView,
  { status: "ACTIVE"; type: "PROFILE" }
>;

function subscribeReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PublicProfileRedesigned({
  view,
  imageUrl,
}: {
  view: ActiveProfileView;
  imageUrl: string | null;
}) {
  const t = useTranslations("publicProfile");
  const { profile, links, card_id } = view;
  const profileUrl = getCardProfileUrl(card_id);

  const avatarRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  useEffect(() => {
    if (prefersReducedMotion) return;

    const isTouchDevice =
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(pointer: coarse)").matches;

    if (isTouchDevice) {
      const avatar = avatarRef.current;
      if (avatar) {
        avatar.classList.add("avatar-fade-in");
      }
      return;
    }

    let rafId: number;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const animate = () => {
      targetX += (mouseX - targetX) * 0.1;
      targetY += (mouseY - targetY) * 0.1;

      const maxOffset = 14;
      const x = targetX * maxOffset;
      const y = targetY * maxOffset;
      const tilt = targetX * 2;

      if (avatarRef.current) {
        avatarRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  return (
    <main className="link-in-bio-main">
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
                      alt={profile.full_name}
                      width={260}
                      height={260}
                      loading="eager"
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      <User className="h-16 w-16" aria-hidden />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <h1 className="profile-name animate-fade-in-up" style={{ animationDelay: "80ms" }}>
              {profile.full_name}
            </h1>

            {profile.bio && (
              <p className="profile-bio animate-fade-in-up" style={{ animationDelay: "140ms" }}>
                {profile.bio}
              </p>
            )}

            <div className="contact-line animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <ContactActions
                cardId={card_id}
                phone={profile.phone}
                whatsapp={profile.whatsapp}
                email={profile.email}
                website={profile.website}
                googleMapsUrl={profile.google_maps_url}
              />
            </div>
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
                      onClick={() => trackCardEvent(card_id, { type: "LINK_CLICK", linkId: link.id })}
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
                    <User className="h-6 w-6" />
                  </span>
                  <div className="link-card-content">
                    <h3 className="link-card-title">{t("emptyLinksTitle")}</h3>
                    <p className="link-card-subtitle">{t("emptyLinksSubtitle")}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="action-buttons-row animate-fade-in-up" style={{ animationDelay: `${240 + links.length * 60}ms` }}>
              <ShareButton cardId={card_id} url={profileUrl} title={profile.full_name} />
              <SaveContactButton
                cardId={card_id}
                fullName={profile.full_name}
                jobTitle={profile.job_title}
                phone={profile.phone}
                email={profile.email}
                website={profile.website}
              />
            </div>

            <p className="footer-credit animate-fade-in-up" style={{ animationDelay: `${300 + links.length * 60}ms` }}>
              {t("poweredBy")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
