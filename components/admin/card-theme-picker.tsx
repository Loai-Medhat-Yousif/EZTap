"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { CardTheme } from "@/types";
import {
  CARD_HOT_PICKS,
  cardAccentStyle,
  normalizeCardAccent,
  parseCardAccent,
} from "@/lib/cards/accent-color";
import type { CardThemeEditActions } from "@/lib/cards/profile-edit-actions";
import * as adminActions from "@/app/admin/cards/actions";
import { cn } from "@/lib/utils";

/**
 * Free accent-colour picker for a card's public page.
 *
 * The `<input type="color">` is the important part for phones: iOS and
 * Android both open their native colour picker, while desktop browsers
 * open the OS picker (or an inline one). The hex field and hot-pick
 * swatches are shortcuts around it, not replacements.
 *
 * Saves are debounced: dragging the native picker fires `change`
 * continuously on desktop, so waiting ~500ms after the last change keeps
 * that to one write. The swatch/preview use `cardAccentStyle`, the exact
 * variables the public page uses, so what's shown here is what ships.
 */
export function CardThemePicker({
  scope,
  value,
  actions = adminActions,
}: {
  scope: string;
  value: CardTheme;
  actions?: CardThemeEditActions;
}) {
  const t = useTranslations("links");
  const hexId = useId();
  const normalizedValue = normalizeCardAccent(value);

  const [saved, setSaved] = useState(normalizedValue);
  const [draft, setDraft] = useState(normalizedValue);
  const [hexInput, setHexInput] = useState(normalizedValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Keep in sync when the server sends a new value after revalidation.
  // Adjusting state during render (instead of in an effect) is React's
  // recommended pattern for a prop that can change under us.
  const [lastValue, setLastValue] = useState(normalizedValue);
  if (normalizedValue !== lastValue) {
    setLastValue(normalizedValue);
    setSaved(normalizedValue);
    setDraft(normalizedValue);
    setHexInput(normalizedValue);
    setError(null);
  }

  useEffect(() => {
    if (isPending || draft === saved) return;

    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await actions.updateCardTheme(scope, draft);
        if (result?.error) {
          setDraft(saved);
          setHexInput(saved);
          setError(result.error);
        } else {
          setSaved(draft);
          setError(null);
          toast.success(t("themeUpdated"));
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [actions, draft, isPending, saved, scope, startTransition, t]);

  function applyColor(next: string) {
    const normalized = parseCardAccent(next);
    if (!normalized) return;
    setDraft(normalized);
    setHexInput(normalized);
    setError(null);
  }

  function handleHexChange(raw: string) {
    setHexInput(raw);
    const normalized = parseCardAccent(raw);
    if (normalized) {
      setDraft(normalized);
      setError(null);
    } else if (raw.trim().length > 0) {
      setError(t("themeInvalidHex"));
    } else {
      setError(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("themeDescription")}</p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={draft}
          onChange={(event) => applyColor(event.target.value)}
          aria-label={t("themePickColor")}
          className="h-11 w-16 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />

        <div className="min-w-40 flex-1">
          <label
            htmlFor={hexId}
            className="text-xs font-medium text-muted"
          >
            {t("themeHexLabel")}
          </label>
          <input
            id={hexId}
            type="text"
            value={hexInput}
            onChange={(event) => handleHexChange(event.target.value)}
            onBlur={() => {
              if (!parseCardAccent(hexInput)) setHexInput(draft);
            }}
            maxLength={7}
            autoComplete="off"
            spellCheck={false}
            placeholder="#005CF2"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm uppercase text-ink outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">
          {t("themeHotPicks")}
        </p>
        <div className="flex flex-wrap gap-2">
          {CARD_HOT_PICKS.map((color) => {
            const isSelected = normalizeCardAccent(color) === draft;
            return (
              <button
                key={color}
                type="button"
                onClick={() => applyColor(color)}
                aria-label={color}
                aria-pressed={isSelected}
                title={color}
                style={{ backgroundColor: color }}
                className={cn(
                  "h-8 w-8 rounded-full ring-1 ring-black/15 transition-transform hover:scale-110",
                  isSelected &&
                    "ring-2 ring-ink ring-offset-2 ring-offset-surface-raised",
                )}
              />
            );
          })}
        </div>
      </div>

      <div
        data-card-accent
        style={cardAccentStyle(draft)}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
      >
        <span className="h-8 w-8 shrink-0 rounded-full bg-primary" aria-hidden />
        <span className="text-sm font-semibold text-primary">
          {t("themePreview")}
        </span>
        <span className="ms-auto rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-ink">
          Aa
        </span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {isPending && <p className="text-xs text-muted">{t("saving")}</p>}
    </div>
  );
}
