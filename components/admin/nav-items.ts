import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Wallet,
  Wrench,
  Settings,
  Printer,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "cards"
    | "analytics"
    | "statistics"
    | "print"
    | "tools"
    | "settings";
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/admin/cards", labelKey: "cards", icon: CreditCard },
  { href: "/admin/analytics", labelKey: "analytics", icon: BarChart3 },
  { href: "/admin/statistics", labelKey: "statistics", icon: Wallet },
  { href: "/admin/print-template", labelKey: "print", icon: Printer },
  { href: "/admin/tools", labelKey: "tools", icon: Wrench },
  { href: "/admin/settings", labelKey: "settings", icon: Settings },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}
