"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import * as adminActions from "@/app/admin/cards/actions";
import type { ProfileEditActions } from "@/lib/cards/profile-edit-actions";
import type { ProfileLink } from "@/types";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { LinkForm } from "@/components/admin/link-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProfileLinksManager({
  scope,
  links,
  actions = adminActions,
}: {
  scope: string;
  links: ProfileLink[];
  actions?: ProfileEditActions;
}) {
  const t = useTranslations("links");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMove(linkId: string, direction: "up" | "down") {
    startTransition(async () => {
      await actions.moveProfileLink(scope, linkId, direction);
    });
  }

  function handleToggleActive(linkId: string, next: boolean) {
    startTransition(async () => {
      await actions.setProfileLinkActive(scope, linkId, next);
    });
  }

  function handleDelete(linkId: string) {
    startTransition(async () => {
      const result = await actions.deleteProfileLink(scope, linkId);
      if (result?.error) toast.error(result.error);
      else toast.success(t("linkDeleted"));
    });
  }

  return (
    <div className="space-y-3">
      {links.length === 0 && !isAdding && (
        <p className="text-sm text-muted">{t("noLinksYet")}</p>
      )}

      <ul className="space-y-2">
        {links.map((link, index) => {
          const Icon = getLinkIcon(link.icon);

          if (editingId === link.id) {
            return (
              <li key={link.id} className="rounded-xl border border-border p-4">
                <LinkForm
                  defaultValues={{
                    icon: link.icon,
                    title: link.title,
                    url: link.url,
                  }}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (values) => {
                    const result = await actions.updateProfileLink(
                      scope,
                      link.id,
                      values,
                    );
                    if (!result?.error) setEditingId(null);
                    return result;
                  }}
                />
              </li>
            );
          }

          return (
            <li
              key={link.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border p-3",
                !link.is_active && "opacity-60",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink">
                <Icon className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {link.title}
                </p>
                <p className="truncate text-xs text-muted">{link.url}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0 || isPending}
                  onClick={() => handleMove(link.id, "up")}
                  aria-label={t("moveUp")}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === links.length - 1 || isPending}
                  onClick={() => handleMove(link.id, "down")}
                  aria-label={t("moveDown")}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleActive(link.id, !link.is_active)}
                  disabled={isPending}
                  aria-label={link.is_active ? t("disable") : t("enable")}
                >
                  {link.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingId(link.id)}
                  aria-label={t("edit")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(link.id)}
                  disabled={isPending}
                  aria-label={t("delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {isAdding ? (
        <div className="rounded-xl border border-border p-4">
          <LinkForm
            defaultValues={{ icon: "custom", title: "", url: "" }}
            onCancel={() => setIsAdding(false)}
            onSubmit={async (values) => {
              const result = await actions.addProfileLink(scope, values);
              if (!result?.error) setIsAdding(false);
              return result;
            }}
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("addLink")}
        </Button>
      )}
    </div>
  );
}
