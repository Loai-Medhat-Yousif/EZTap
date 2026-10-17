import { getTranslations } from "next-intl/server";
import { User } from "lucide-react";
import { ContactActions } from "@/components/profile/contact-actions";
import { DynamicLinksList } from "@/components/profile/dynamic-links-list";
import { ShareButton } from "@/components/profile/share-button";
import { SaveContactButton } from "@/components/profile/save-contact-button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import type { PublicCardView } from "@/types";
import { getCardProfileUrl } from "@/lib/cards/urls";

type ActiveProfileView = Extract<
  PublicCardView,
  { status: "ACTIVE"; type: "PROFILE" }
>;

export async function PublicProfileView({
  view,
  imageUrl,
}: {
  view: ActiveProfileView;
  imageUrl: string | null;
}) {
  const t = await getTranslations("publicProfile");
  const { profile, links, card_id } = view;
  const profileUrl = getCardProfileUrl(card_id);

  return (
    <main className="relative min-h-screen bg-linear-to-b from-primary-tint via-background to-background px-4 pb-16 pt-6">
      <div className="mx-auto flex max-w-sm items-center justify-end gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      <div className="mx-auto mt-6 flex max-w-sm flex-col items-center">
        <div className="animate-fade-in-up overflow-hidden rounded-full border-4 border-surface-raised bg-surface shadow-lg">
          {imageUrl ? (
            // Supabase Storage URL — not a static asset next/image can
            // optimize without configuring the project's own domain.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={profile.full_name}
              className="h-28 w-28 object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center">
              <User className="h-10 w-10 text-muted" aria-hidden />
            </div>
          )}
        </div>

        <h1
          className="mt-5 animate-fade-in-up text-2xl font-semibold text-ink"
          style={{ animationDelay: "80ms" }}
        >
          {profile.full_name}
        </h1>

        {profile.job_title && (
          <p
            className="mt-1 animate-fade-in-up text-sm text-muted"
            style={{ animationDelay: "140ms" }}
          >
            {profile.job_title}
          </p>
        )}

        {profile.bio && (
          <p
            className="mt-4 animate-fade-in-up text-center text-sm leading-relaxed text-ink"
            style={{ animationDelay: "180ms" }}
          >
            {profile.bio}
          </p>
        )}

        <div className="mt-6 w-full">
          <ContactActions
            cardId={card_id}
            phone={profile.phone}
            whatsapp={profile.whatsapp}
            email={profile.email}
            website={profile.website}
            googleMapsUrl={profile.google_maps_url}
          />
        </div>

        {links.length > 0 && (
          <div className="mt-6 w-full">
            <DynamicLinksList cardId={card_id} links={links} />
          </div>
        )}

        <div className="mt-7 flex items-center gap-8">
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

        <p className="mt-10 text-[11px] text-muted">{t("poweredBy")}</p>
      </div>
    </main>
  );
}
