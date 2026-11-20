"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  Upload,
  X,
  Eye,
  EyeOff,
  Tag,
} from "lucide-react";
import type { MenuCategory, MenuItem, MenuOffer } from "@/types";
import type { MenuEditActions } from "@/lib/cards/profile-edit-actions";
import { compressImageForUpload } from "@/lib/images/compress-image";
import { formatMenuPrice, MENU_CURRENCY } from "@/lib/cards/menu-price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CategoryWithItems = MenuCategory & { items: MenuItem[] };

function toLocalDateTimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDateTimeValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

async function pickAndCompress(
  e: ChangeEvent<HTMLInputElement>,
): Promise<File | null> {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return null;
  try {
    const result = await compressImageForUpload(file);
    if ("error" in result) return file;
    return result.file;
  } catch {
    return file; // fallback; server will validate
  }
}

function SmallImageUpload({
  label,
  imageUrl,
  onUpload,
  onRemove,
  disabled,
}: {
  label: string;
  imageUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  disabled?: boolean;
}) {
  const t = useTranslations("links");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = await pickAndCompress(e);
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await onRemove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted" aria-hidden />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {busy ? t("uploading", { default: "Uploading..." }) : label}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || busy}
            onClick={handleRemove}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {t("removePhoto")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Numeric amount field with the fixed EGP suffix shown beside the input. */
function AmountInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        className="pe-14"
      />
      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-semibold text-muted">
        {MENU_CURRENCY}
      </span>
    </div>
  );
}

export function MenuManager({
  scope,
  categories,
  offers,
  actions,
  getImageUrl,
}: {
  scope: string;
  categories: CategoryWithItems[];
  offers: MenuOffer[];
  actions: MenuEditActions;
  /** Resolve a stored image_path to a public URL. Prefer pre-resolved
   *  `imageUrl` fields on items/offers when provided. */
  getImageUrl?: (path: string | null) => string | null;
}) {
  const resolve = (path: string | null, obj?: unknown): string | null => {
    const url = (obj as { imageUrl?: string | null } | null | undefined)?.imageUrl;
    return url ?? (getImageUrl ? getImageUrl(path) : null);
  };
  const t = useTranslations("links");
  const tc = useTranslations("cards");
  const [isPending, startTransition] = useTransition();

  // Category add/edit state
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // Item add/edit state
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<{
    categoryId: string;
    name: string;
    description: string;
    price: string;
    isAvailable: boolean;
    discountLabel: string;
    discountPrice: string;
    discountStartsAt: string;
    discountEndsAt: string;
  } | null>(null);

  // Offer add/edit state
  const [addingOffer, setAddingOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerDraft, setOfferDraft] = useState<{
    title: string;
    description: string;
    priceText: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
  } | null>(null);

  function run(fn: () => Promise<{ error?: string }>, success?: string) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else if (success) toast.success(success);
    });
  }

  function move<T extends { id: string }>(arr: T[], index: number, dir: -1 | 1): string[] | null {
    const j = index + dir;
    if (j < 0 || j >= arr.length) return null;
    const copy = arr.map((x) => x.id);
    [copy[index], copy[j]] = [copy[j], copy[index]];
    return copy;
  }

  // --- Category handlers ---
  function submitAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    run(async () => {
      const r = await actions.addMenuCategory(scope, { name, isActive: true });
      if (!r?.error) { setAddingCategory(false); setNewCategoryName(""); }
      return r ?? {};
    });
  }

  function submitEditCategory(categoryId: string, isActive: boolean) {
    const name = editingCategoryName.trim();
    if (!name) return;
    run(async () => {
      const r = await actions.updateMenuCategory(scope, categoryId, { name, isActive });
      if (!r?.error) setEditingCategoryId(null);
      return r ?? {};
    });
  }

  // --- Item helpers ---
  function startAddItem(categoryId: string) {
    setAddingItemFor(categoryId);
    setEditingItemId(null);
    setItemDraft({ categoryId, name: "", description: "", price: "", isAvailable: true, discountLabel: "", discountPrice: "", discountStartsAt: "", discountEndsAt: "" });
  }

  function startEditItem(item: MenuItem) {
    setEditingItemId(item.id);
    setAddingItemFor(null);
    setItemDraft({
      categoryId: item.category_id,
      name: item.name,
      description: item.description ?? "",
      price: item.price ?? "",
      isAvailable: item.is_available,
      discountLabel: item.discount_label ?? "",
      discountPrice: item.discount_price ?? "",
      discountStartsAt: toLocalDateTimeValue(item.discount_starts_at),
      discountEndsAt: toLocalDateTimeValue(item.discount_ends_at),
    });
  }

  function submitItem(isNew: boolean, itemId?: string) {
    if (!itemDraft) return;
    const input = {
      categoryId: itemDraft.categoryId as string,
      name: (itemDraft.name as string).trim(),
      description: (itemDraft.description as string).trim() || undefined,
      price: (itemDraft.price as string).trim() || undefined,
      isAvailable: !!itemDraft.isAvailable,
      discountLabel: (itemDraft.discountLabel as string).trim() || undefined,
      discountPrice: (itemDraft.discountPrice as string).trim() || undefined,
      discountStartsAt: fromLocalDateTimeValue(itemDraft.discountStartsAt as string),
      discountEndsAt: fromLocalDateTimeValue(itemDraft.discountEndsAt as string),
    };
    if (!input.name) return;
    run(async () => {
      const r = isNew
        ? await actions.addMenuItem(scope, input)
        : await actions.updateMenuItem(scope, itemId!, input);
      if (!r?.error) { setAddingItemFor(null); setEditingItemId(null); setItemDraft(null); }
      return r ?? {};
    });
  }

  // --- Offer helpers ---
  function startAddOffer() {
    setAddingOffer(true);
    setEditingOfferId(null);
    setOfferDraft({ title: "", description: "", priceText: "", startsAt: "", endsAt: "", isActive: true });
  }

  function startEditOffer(offer: MenuOffer) {
    setEditingOfferId(offer.id);
    setAddingOffer(false);
    setOfferDraft({
      title: offer.title,
      description: offer.description ?? "",
      priceText: offer.price_text ?? "",
      startsAt: toLocalDateTimeValue(offer.starts_at),
      endsAt: toLocalDateTimeValue(offer.ends_at),
      isActive: offer.is_active,
    });
  }

  function submitOffer(isNew: boolean, offerId?: string) {
    if (!offerDraft) return;
    const input = {
      title: (offerDraft.title as string).trim(),
      description: (offerDraft.description as string).trim() || undefined,
      priceText: (offerDraft.priceText as string).trim() || undefined,
      startsAt: fromLocalDateTimeValue(offerDraft.startsAt as string),
      endsAt: fromLocalDateTimeValue(offerDraft.endsAt as string),
      isActive: !!offerDraft.isActive,
    };
    if (!input.title) return;
    run(async () => {
      const r = isNew
        ? await actions.addMenuOffer(scope, input)
        : await actions.updateMenuOffer(scope, offerId!, input);
      if (!r?.error) { setAddingOffer(false); setEditingOfferId(null); setOfferDraft(null); }
      return r ?? {};
    });
  }

  function itemForm(categoryId: string, isNew: boolean, itemId?: string) {
    if (!itemDraft || itemDraft.categoryId !== categoryId) return null;
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("menuItemName", { default: "Item name" })}</Label>
            <Input value={itemDraft.name} onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })} />
          </div>
          <div>
            <Label>{t("menuItemPrice", { default: "Price" })}</Label>
            <AmountInput
              value={itemDraft.price}
              onChange={(price) => setItemDraft({ ...itemDraft, price })}
              placeholder={t("menuItemPricePlaceholder", { default: "e.g. 120" })}
            />
          </div>
        </div>
        <div>
          <Label>{t("menuItemDescription", { default: "Description" })}</Label>
          <Textarea rows={2} value={itemDraft.description} onChange={(e) => setItemDraft({ ...itemDraft, description: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("menuDiscountLabel", { default: "Discount label" })}</Label>
            <Input value={itemDraft.discountLabel} onChange={(e) => setItemDraft({ ...itemDraft, discountLabel: e.target.value })} placeholder={t("menuDiscountLabelPlaceholder", { default: "e.g. -20%" })} />
          </div>
          <div>
            <Label>{t("menuDiscountPrice", { default: "Discounted price" })}</Label>
            <AmountInput
              value={itemDraft.discountPrice}
              onChange={(discountPrice) => setItemDraft({ ...itemDraft, discountPrice })}
              placeholder={t("menuItemPricePlaceholder", { default: "e.g. 120" })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("menuDiscountStartsAt", { default: "Discount starts" })}</Label>
            <Input type="datetime-local" value={itemDraft.discountStartsAt} onChange={(e) => setItemDraft({ ...itemDraft, discountStartsAt: e.target.value })} />
          </div>
          <div>
            <Label>{t("menuDiscountEndsAt", { default: "Discount ends" })}</Label>
            <Input type="datetime-local" value={itemDraft.discountEndsAt} onChange={(e) => setItemDraft({ ...itemDraft, discountEndsAt: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={!!itemDraft.isAvailable} onChange={(e) => setItemDraft({ ...itemDraft, isAvailable: e.target.checked })} />
          {t("menuItemAvailable", { default: "Available" })}
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isPending} onClick={() => submitItem(isNew, itemId)}>{tc("saveChanges")}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => { setAddingItemFor(null); setEditingItemId(null); setItemDraft(null); }}>{tc("cancel", { default: "Cancel" })}</Button>
        </div>
      </div>
    );
  }

  function offerForm(isNew: boolean, offerId?: string) {
    if (!offerDraft) return null;
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("menuOfferTitle", { default: "Offer title" })}</Label>
            <Input value={offerDraft.title} onChange={(e) => setOfferDraft({ ...offerDraft, title: e.target.value })} />
          </div>
          <div>
            <Label>{t("menuOfferPriceText", { default: "Price / discount text" })}</Label>
            <AmountInput
              value={offerDraft.priceText}
              onChange={(priceText) => setOfferDraft({ ...offerDraft, priceText })}
              placeholder={t("menuItemPricePlaceholder", { default: "e.g. 120" })}
            />
          </div>
        </div>
        <div>
          <Label>{t("menuOfferDescription", { default: "Description" })}</Label>
          <Textarea rows={2} value={offerDraft.description} onChange={(e) => setOfferDraft({ ...offerDraft, description: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("menuOfferStartsAt", { default: "Starts at" })}</Label>
            <Input type="datetime-local" value={offerDraft.startsAt} onChange={(e) => setOfferDraft({ ...offerDraft, startsAt: e.target.value })} />
          </div>
          <div>
            <Label>{t("menuOfferEndsAt", { default: "Ends at" })}</Label>
            <Input type="datetime-local" value={offerDraft.endsAt} onChange={(e) => setOfferDraft({ ...offerDraft, endsAt: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={!!offerDraft.isActive} onChange={(e) => setOfferDraft({ ...offerDraft, isActive: e.target.checked })} />
          {t("menuOfferActive", { default: "Active" })}
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isPending} onClick={() => submitOffer(isNew, offerId)}>{tc("saveChanges")}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => { setAddingOffer(false); setEditingOfferId(null); setOfferDraft(null); }}>{tc("cancel", { default: "Cancel" })}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Categories & items */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{t("menuCategoriesTitle", { default: "Menu categories" })}</h3>
          {!addingCategory && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddingCategory(true)} disabled={isPending}>
              <Plus className="h-3.5 w-3.5" aria-hidden />{t("menuAddCategory", { default: "Add category" })}
            </Button>
          )}
        </div>

        {addingCategory && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
            <div className="min-w-0 flex-1 sm:min-w-[220px]">
              <Label>{t("menuCategoryName", { default: "Category name" })}</Label>
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            </div>
            <Button type="button" size="sm" disabled={isPending} onClick={submitAddCategory}>{tc("saveChanges")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}>{tc("cancel", { default: "Cancel" })}</Button>
          </div>
        )}

        {categories.length === 0 && !addingCategory && (
          <p className="text-sm text-muted">{t("menuNoCategories", { default: "No categories yet." })}</p>
        )}

        <div className="space-y-4">
          {categories.map((cat, catIndex) => (
            <div key={cat.id} className={cn("rounded-2xl border border-border p-4", !cat.is_active && "opacity-70")}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                {editingCategoryId === cat.id ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1 sm:min-w-[200px]">
                      <Label>{t("menuCategoryName", { default: "Category name" })}</Label>
                      <Input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} />
                    </div>
                    <Button type="button" size="sm" disabled={isPending} onClick={() => submitEditCategory(cat.id, cat.is_active)}>{tc("saveChanges")}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>{tc("cancel", { default: "Cancel" })}</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h4 className="min-w-0 break-words text-sm font-semibold text-ink [overflow-wrap:anywhere]">{cat.name}</h4>
                      {!cat.is_active && <span className="shrink-0 text-xs text-muted">({t("menuHidden", { default: "hidden" })})</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" disabled={isPending || catIndex === 0} aria-label={t("menuMoveUp", { default: "Move up" })} onClick={() => { const ids = move(categories, catIndex, -1); if (ids) run(() => actions.reorderMenuCategories(scope, ids)); }}><ChevronUp className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" disabled={isPending || catIndex === categories.length - 1} aria-label={t("menuMoveDown", { default: "Move down" })} onClick={() => { const ids = move(categories, catIndex, 1); if (ids) run(() => actions.reorderMenuCategories(scope, ids)); }}><ChevronDown className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label={cat.is_active ? t("menuHide", { default: "Hide" }) : t("menuShow", { default: "Show" })} onClick={() => run(() => actions.updateMenuCategory(scope, cat.id, { name: cat.name, isActive: !cat.is_active }))}>{cat.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                      <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label={t("edit")} onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label={t("delete")} onClick={() => run(() => actions.deleteMenuCategory(scope, cat.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                {cat.items.map((item, itemIndex) => (
                  <div key={item.id} className={cn("rounded-xl border border-border p-3", !item.is_available && "opacity-70")}>
                    {editingItemId === item.id ? itemForm(cat.id, false, item.id) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium text-ink [overflow-wrap:anywhere]">{item.name}</p>
                            {item.description && <p className="break-words text-xs text-muted [overflow-wrap:anywhere]">{item.description}</p>}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              {formatMenuPrice(item.price) && (
                                <span className="break-words text-ink [overflow-wrap:anywhere]">{formatMenuPrice(item.price)}</span>
                              )}
                              {(item.discount_label || item.discount_price) && (
                                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-tint px-2 py-0.5 text-primary [overflow-wrap:anywhere]"><Tag className="h-3 w-3 shrink-0" /><span className="min-w-0 break-words">{item.discount_label || formatMenuPrice(item.discount_price)}</span></span>
                              )}
                              {!item.is_available && <span className="shrink-0 text-muted">{t("menuUnavailable", { default: "Unavailable" })}</span>}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" disabled={isPending || itemIndex === 0} aria-label={t("menuMoveUp", { default: "Move up" })} onClick={() => { const ids = move(cat.items, itemIndex, -1); if (ids) run(() => actions.reorderMenuItems(scope, cat.id, ids)); }}><ChevronUp className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" disabled={isPending || itemIndex === cat.items.length - 1} aria-label={t("menuMoveDown", { default: "Move down" })} onClick={() => { const ids = move(cat.items, itemIndex, 1); if (ids) run(() => actions.reorderMenuItems(scope, cat.id, ids)); }}><ChevronDown className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label={t("edit")} onClick={() => startEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label={t("delete")} onClick={() => run(() => actions.deleteMenuItem(scope, item.id))}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <SmallImageUpload
                          label={t("menuItemImage", { default: "Item image" })}
                          imageUrl={resolve(item.image_path, item)}
                          onUpload={async (file) => {
                            const fd = new FormData();
                            fd.set("file", file);
                            const res = await actions.uploadMenuItemImage(scope, item.id, fd);
                            if (res?.error) toast.error(res.error); else toast.success(t("photoUpdated"));
                          }}
                          onRemove={async () => {
                            const res = await actions.removeMenuItemImage(scope, item.id);
                            if (res?.error) toast.error(res.error); else toast.success(t("photoRemoved"));
                          }}
                          disabled={isPending}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {addingItemFor === cat.id ? itemForm(cat.id, true) : (
                  <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => startAddItem(cat.id)}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />{t("menuAddItem", { default: "Add item" })}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Offers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{t("menuOffersTitleAdmin", { default: "Special offers" })}</h3>
          {!addingOffer && (
            <Button type="button" variant="secondary" size="sm" onClick={startAddOffer} disabled={isPending}>
              <Plus className="h-3.5 w-3.5" aria-hidden />{t("menuAddOffer", { default: "Add offer" })}
            </Button>
          )}
        </div>

        {addingOffer && offerForm(true)}

        {offers.length === 0 && !addingOffer && (
          <p className="text-sm text-muted">{t("menuNoOffers", { default: "No offers yet." })}</p>
        )}

        <div className="space-y-3">
          {offers.map((offer, offerIndex) => (
            <div key={offer.id} className={cn("rounded-xl border border-border p-3", !offer.is_active && "opacity-70")}>
              {editingOfferId === offer.id ? offerForm(false, offer.id) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-ink [overflow-wrap:anywhere]">{offer.title}</p>
                      {offer.description && <p className="break-words text-xs text-muted [overflow-wrap:anywhere]">{offer.description}</p>}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                        {formatMenuPrice(offer.price_text) && (
                          <span className="break-words font-medium text-ink [overflow-wrap:anywhere]">{formatMenuPrice(offer.price_text)}</span>
                        )}
                        {(offer.starts_at || offer.ends_at) && (
                          <span className="break-words [overflow-wrap:anywhere]">
                            {[offer.starts_at ? new Date(offer.starts_at).toLocaleString() : null, offer.ends_at ? new Date(offer.ends_at).toLocaleString() : null].filter(Boolean).join(" – ")}
                          </span>
                        )}
                        {!offer.is_active && <span className="shrink-0">({t("menuInactive", { default: "inactive" })})</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" disabled={isPending || offerIndex === 0} aria-label={t("menuMoveUp", { default: "Move up" })} onClick={() => { const ids = move(offers, offerIndex, -1); if (ids) run(() => actions.reorderMenuOffers(scope, ids)); }}><ChevronUp className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" disabled={isPending || offerIndex === offers.length - 1} aria-label={t("menuMoveDown", { default: "Move down" })} onClick={() => { const ids = move(offers, offerIndex, 1); if (ids) run(() => actions.reorderMenuOffers(scope, ids)); }}><ChevronDown className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label={t("edit")} onClick={() => startEditOffer(offer)}><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label={t("delete")} onClick={() => run(() => actions.deleteMenuOffer(scope, offer.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <SmallImageUpload
                    label={t("menuOfferImage", { default: "Offer image" })}
                    imageUrl={resolve(offer.image_path, offer)}
                    onUpload={async (file) => {
                      const fd = new FormData();
                      fd.set("file", file);
                      const res = await actions.uploadMenuOfferImage(scope, offer.id, fd);
                      if (res?.error) toast.error(res.error); else toast.success(t("photoUpdated"));
                    }}
                    onRemove={async () => {
                      const res = await actions.removeMenuOfferImage(scope, offer.id);
                      if (res?.error) toast.error(res.error); else toast.success(t("photoRemoved"));
                    }}
                    disabled={isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
