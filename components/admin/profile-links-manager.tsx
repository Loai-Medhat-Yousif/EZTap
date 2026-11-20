"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from "lucide-react";
import * as adminActions from "@/app/admin/cards/actions";
import type { LinkEditActions } from "@/lib/cards/profile-edit-actions";
import { usePointerSort } from "@/lib/hooks/use-pointer-sort";
import { getLinkIcon } from "@/lib/constants/link-icons";
import { LinkForm } from "@/components/admin/link-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The minimum a link row needs for this manager — satisfied by both
 * `ProfileLink` and `StoreLink`, so the same component manages either.
 */
export type LinkListRow = {
  id: string;
  icon: string;
  title: string;
  url: string;
  is_active: boolean;
};

export function ProfileLinksManager({
  scope,
  links,
  actions = adminActions,
}: {
  scope: string;
  links: LinkListRow[];
  actions?: LinkEditActions;
}) {
  const t = useTranslations("links");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reordering is local until saved: dragging rearranges a copy, the
  // bar below appears once that copy differs from the server's, and one
  // Save persists the whole order — rather than a round trip per move.
  const {
    order,
    isDirty,
    reset,
    dragIndex,
    overIndex,
    isDragging,
    dragOffset,
    shift,
    handleProps,
    rowProps,
  } = usePointerSort({
    items: links,
    getId: (link) => link.id,
    // Measuring a row that's swapped out for a form would make the
    // pointer math meaningless, so dragging waits until it's closed.
    disabled: isPending || editingId !== null || isAdding,
  });

  function handleSaveOrder() {
    startTransition(async () => {
      const result = await actions.reorderProfileLinks(
        scope,
        order.map((link) => link.id),
      );
      if (result?.error) toast.error(result.error);
      else toast.success(t("orderSaved"));
    });
  }

  function handleToggleActive(linkId: string, next: boolean) {
    startTransition(async () => {
      const result = await actions.setProfileLinkActive(scope, linkId, next);
      if (result?.error) toast.error(result.error);
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

      <div aria-live="polite">
        {isDirty && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-medium text-warning">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-warning"
                aria-hidden
              />
              {t("unsavedOrder")}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={isPending}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t("discardOrder")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveOrder}
                disabled={isPending}
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
                {isPending ? t("saving") : t("saveOrder")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {order.length > 1 && !isDirty && !isAdding && editingId === null && (
        <p className="text-xs text-muted">{t("reorderHint")}</p>
      )}

      <ul
        className={cn("space-y-2", isDragging && "select-none")}
        aria-busy={isDragging || undefined}
      >
        {order.map((link, index) => {
          const Icon = getLinkIcon(link.icon);
          const isDragged = dragIndex === index;

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
              {...rowProps(link.id)}
              style={{
                transform: `translateY(${isDragged ? dragOffset : shift(link.id)}px)`,
                zIndex: isDragged ? 10 : undefined,
              }}
              className={cn(
                "relative flex items-center gap-2 rounded-xl border border-border p-3",
                !isDragged && "transition-transform duration-150",
                isDragged && "border-primary bg-surface-raised shadow-lift",
                overIndex === index &&
                  dragIndex !== null &&
                  dragIndex !== index &&
                  "border-primary/60",
                !link.is_active && "opacity-60",
              )}
            >
              <button
                type="button"
                {...handleProps(link.id)}
                aria-label={t("reorder")}
                title={t("reorder")}
                className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" aria-hidden />
              </button>

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
