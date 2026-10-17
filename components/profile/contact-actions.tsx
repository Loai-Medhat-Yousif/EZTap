"use client";

import type { ComponentType } from "react";
import { Phone, Mail, Globe, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { trackCardEvent, type TrackableEvent } from "@/lib/analytics/track-client";

type ContactActionEventType = Extract<
  TrackableEvent,
  { type: "PHONE_CLICK" | "WHATSAPP_CLICK" | "EMAIL_CLICK" | "WEBSITE_CLICK" | "MAPS_CLICK" }
>["type"];

type ContactAction = {
  key: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  label: string;
  eventType: ContactActionEventType;
};

export function ContactActions({
  cardId,
  phone,
  whatsapp,
  email,
  website,
  googleMapsUrl,
}: {
  cardId: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
}) {
  const t = useTranslations("publicProfile");

  const actions: (ContactAction | null)[] = [
    phone
      ? {
          key: "phone",
          icon: Phone,
          href: `tel:${phone}`,
          label: t("call"),
          eventType: "PHONE_CLICK" as const,
        }
      : null,
    whatsapp
      ? {
          key: "whatsapp",
          icon: getLinkIcon("whatsapp"),
          href: `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`,
          label: t("whatsapp"),
          eventType: "WHATSAPP_CLICK" as const,
        }
      : null,
    email
      ? {
          key: "email",
          icon: Mail,
          href: `mailto:${email}`,
          label: t("email"),
          eventType: "EMAIL_CLICK" as const,
        }
      : null,
    website
      ? {
          key: "website",
          icon: Globe,
          href: website,
          label: t("website"),
          eventType: "WEBSITE_CLICK" as const,
        }
      : null,
    googleMapsUrl
      ? {
          key: "maps",
          icon: MapPin,
          href: googleMapsUrl,
          label: t("directions"),
          eventType: "MAPS_CLICK" as const,
        }
      : null,
  ];

  const visible = actions.filter((action): action is ContactAction => Boolean(action));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {visible.map(({ key, icon: Icon, href, label, eventType }, index) => (
        <a
          key={key}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          onClick={() => trackCardEvent(cardId, { type: eventType })}
          className="flex animate-fade-in-up flex-col items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
          style={{ animationDelay: `${240 + index * 50}ms` }}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-transform active:scale-95">
            <Icon className="h-5 w-5" />
          </span>
          {label}
        </a>
      ))}
    </div>
  );
}
