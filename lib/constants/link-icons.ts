import type { ComponentType } from "react";
import { Globe, Mail, Phone, MapPin, Wallet, Link2 } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiYoutube,
  SiX,
  SiWhatsapp,
  SiTelegram,
  SiSnapchat,
  SiGithub,
  SiVodafone,
} from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";

export type LinkIconKey =
  | "website"
  | "email"
  | "phone"
  | "google_maps"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "x"
  | "whatsapp"
  | "telegram"
  | "snapchat"
  | "github"
  | "vodafone_cash"
  | "instapay"
  | "custom";

type IconComponent = ComponentType<{ className?: string }>;

/**
 * `lucide-react` is a generic UI icon set with no brand marks at all
 * (verified — it exports nothing named Facebook/Instagram/etc.), so
 * actual platform recognition comes from `react-icons`' bundled Simple
 * Icons (`si`) set, with Font Awesome (`fa6`) filling the one gap
 * Simple Icons has (LinkedIn). `vodafone_cash` maps to a real Vodafone
 * mark; `instapay` has no icon in either set (very regional — Egyptian
 * instant-payment network) so it gets the generic Wallet icon rather
 * than nothing.
 */
export const LINK_ICONS: Record<
  LinkIconKey,
  { icon: IconComponent; labelKey: string }
> = {
  website: { icon: Globe, labelKey: "website" },
  email: { icon: Mail, labelKey: "email" },
  phone: { icon: Phone, labelKey: "phone" },
  google_maps: { icon: MapPin, labelKey: "googleMaps" },
  facebook: { icon: SiFacebook, labelKey: "facebook" },
  instagram: { icon: SiInstagram, labelKey: "instagram" },
  tiktok: { icon: SiTiktok, labelKey: "tiktok" },
  youtube: { icon: SiYoutube, labelKey: "youtube" },
  linkedin: { icon: FaLinkedin, labelKey: "linkedin" },
  x: { icon: SiX, labelKey: "x" },
  whatsapp: { icon: SiWhatsapp, labelKey: "whatsapp" },
  telegram: { icon: SiTelegram, labelKey: "telegram" },
  snapchat: { icon: SiSnapchat, labelKey: "snapchat" },
  github: { icon: SiGithub, labelKey: "github" },
  vodafone_cash: { icon: SiVodafone, labelKey: "vodafoneCash" },
  instapay: { icon: Wallet, labelKey: "instapay" },
  custom: { icon: Link2, labelKey: "custom" },
};

export const LINK_ICON_KEYS = Object.keys(LINK_ICONS) as LinkIconKey[];

export function isLinkIconKey(value: string): value is LinkIconKey {
  return value in LINK_ICONS;
}

export function getLinkIcon(key: string): IconComponent {
  return isLinkIconKey(key) ? LINK_ICONS[key].icon : Link2;
}
