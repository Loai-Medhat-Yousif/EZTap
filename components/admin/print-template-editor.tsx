"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Upload, Trash2, Printer, Save } from "lucide-react";
import {
  PRINT_TEMPLATE_KINDS,
  pageAspectRatio,
  pageWidthPt,
  type PrintTemplate,
  type PrintTemplateKind,
} from "@/lib/print/template";
import { EZTAB_LOGO_DATA_URI } from "@/lib/qr/logo-data-uri";
import {
  savePrintTemplate,
  uploadPrintDesignAction,
  removePrintDesignAction,
} from "@/app/admin/print-template/actions";
import { Button } from "@/components/ui/button";

const SAMPLE_QR_URL = "https://eztab.app/card/123456";
const SAMPLE_CARD_ID = "123456";

// Mirrors lib/qr/generate-qr-svg.ts so the preview shows the branded QR
// (dark backing square + centred logo) exactly as the PDF will.
const QR_MARGIN = 2;
const LOGO_SIZE_RATIO = 0.22;
const LOGO_BACKING_RATIO = 1.35;
const LOGO_BACKING_PCT = LOGO_SIZE_RATIO * LOGO_BACKING_RATIO * 100;
const LOGO_PCT = LOGO_SIZE_RATIO * 100;
const BACKING_COLOR = "#15171F";

type DragTarget = "cardId" | "qr";

type TemplateMap = Record<PrintTemplateKind, PrintTemplate>;
type DesignMap = Record<PrintTemplateKind, string | null>;

/**
 * Drag-and-drop editor for the print templates. Each card type has its own
 * template (page size in cm + design + card ID / QR placement); the tabs
 * switch between them. Positions are fractions of the page (0..1) so the
 * preview scales to the container while preserving the page aspect.
 */
export function PrintTemplateEditor({
  templates,
  designUrls,
}: {
  templates: TemplateMap;
  designUrls: DesignMap;
}) {
  const t = useTranslations("print");
  const previewRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [activeKind, setActiveKind] = useState<PrintTemplateKind>(
    PRINT_TEMPLATE_KINDS[0],
  );
  const [configs, setConfigs] = useState<TemplateMap>(templates);
  const [localDesigns, setLocalDesigns] = useState<DesignMap>(designUrls);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [saving, startTransition] = useTransition();
  const [uploading, startUploadTransition] = useTransition();
  const [removing, startRemoveTransition] = useTransition();

  const config = configs[activeKind];
  const localDesign = localDesigns[activeKind];

  function updateConfig(patch: Partial<PrintTemplate>) {
    setConfigs((all) => ({
      ...all,
      [activeKind]: { ...all[activeKind], ...patch },
    }));
  }

  // Track the preview's rendered width so point-based sizes can be shown
  // at the same physical scale as the PDF (the page is pageWidthPt wide).
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setPreviewWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = previewWidth > 0 ? previewWidth / pageWidthPt(config) : 1;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(SAMPLE_QR_URL, {
      errorCorrectionLevel: "H",
      margin: QR_MARGIN,
      width: 256,
    })
      .then((u) => {
        if (!cancelled) setQrDataUrl(u);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const previewStyle = useMemo(
    () => ({ aspectRatio: pageAspectRatio(config) }),
    [config],
  );

  function startDrag(
    target: DragTarget,
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const rect = previewRef.current?.getBoundingClientRect();
    const el = event.currentTarget.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      dragOffset.current = {
        x: (event.clientX - el.left) / rect.width,
        y: (event.clientY - el.top) / rect.height,
      };
    } else {
      dragOffset.current = { x: 0, y: 0 };
    }
    setDragging(target);
  }

  function updatePositionFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const fx = Math.min(1, Math.max(0, x / rect.width - dragOffset.current.x));
    const fy = Math.min(1, Math.max(0, y / rect.height - dragOffset.current.y));
    if (dragging === "cardId") {
      updateConfig({ cardIdX: fx, cardIdY: fy });
    } else if (dragging === "qr") {
      updateConfig({ qrX: fx, qrY: fy });
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    updatePositionFromEvent(event);
  }

  function handlePointerUp() {
    setDragging(null);
  }

  function handlePointerLeave() {
    setDragging(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const kind = activeKind;
    const url = URL.createObjectURL(file);
    setLocalDesigns((all) => ({ ...all, [kind]: url }));

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);
    startUploadTransition(async () => {
      const result = await uploadPrintDesignAction(formData);
      if (result.error) {
        setLocalDesigns((all) => ({ ...all, [kind]: designUrls[kind] ?? null }));
        toast.error(result.error);
        URL.revokeObjectURL(url);
        return;
      }
      if (result.url) {
        setLocalDesigns((all) => ({ ...all, [kind]: result.url ?? null }));
      }
      URL.revokeObjectURL(url);
      toast.success(t("designUpdated"));
    });
  }

  function handleRemoveDesign() {
    const kind = activeKind;
    startRemoveTransition(async () => {
      const result = await removePrintDesignAction(kind);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setLocalDesigns((all) => ({ ...all, [kind]: null }));
      toast.success(t("designRemoved"));
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await savePrintTemplate({
        kind: activeKind,
        widthCm: config.widthCm,
        heightCm: config.heightCm,
        cardIdX: config.cardIdX,
        cardIdY: config.cardIdY,
        cardIdFontSize: config.cardIdFontSize,
        cardIdColor: config.cardIdColor,
        qrX: config.qrX,
        qrY: config.qrY,
        qrSize: config.qrSize,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("saved"));
      }
    });
  }

  const disabled = saving || uploading || removing;

  const kindLabel: Record<PrintTemplateKind, string> = {
    profile: t("templateProfile"),
    google_review: t("templateGoogleReview"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-sm font-semibold text-ink">
          {t("templatesLabel")}
        </span>
        {PRINT_TEMPLATE_KINDS.map((kind) => {
          const active = kind === activeKind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setActiveKind(kind)}
              className={
                active
                  ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:text-ink"
              }
            >
              {kindLabel[kind]}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">{t("previewTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("previewHint")}</p>
        </div>
        <a
          href={`/api/admin/cards/123456/print?template=${activeKind}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-raised"
        >
          <Printer className="h-4 w-4" aria-hidden />
          {t("openSamplePdf")}
        </a>
      </div>

      <div
        ref={previewRef}
        className="relative mx-auto w-full max-w-2xl select-none overflow-hidden rounded-2xl border border-border bg-black/90"
        style={previewStyle}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {localDesign ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={localDesign}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-border/40 bg-white/5 px-4 py-2 text-sm text-white/60">
              {t("noDesign")}
            </div>
          </div>
        )}

        <div
          className="absolute touch-none cursor-move"
          style={{
            left: `${config.cardIdX * 100}%`,
            top: `${config.cardIdY * 100}%`,
          }}
          onPointerDown={(event) => startDrag("cardId", event)}
        >
          <div
            className="whitespace-nowrap rounded-md bg-white/90 px-2 py-1 shadow ring-1 ring-black/10"
            style={{
              fontSize: `${config.cardIdFontSize * scale}px`,
              color: config.cardIdColor,
              lineHeight: 1,
            }}
          >
            {SAMPLE_CARD_ID}
          </div>
          <div className="mt-1 rounded-md bg-black/60 px-1.5 py-0.5 text-center text-[10px] text-white/90">
            {t("cardIdLabel")}
          </div>
        </div>

        {qrDataUrl && (
          <div
            className="absolute touch-none cursor-move"
            style={{
              left: `${config.qrX * 100}%`,
              top: `${config.qrY * 100}%`,
            }}
            onPointerDown={(event) => startDrag("qr", event)}
          >
            <div
              className="relative block rounded-md shadow ring-1 ring-black/10"
              style={{
                width: `${config.qrSize * scale}px`,
                height: `${config.qrSize * scale}px`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt=""
                className="block h-full w-full rounded-md"
              />
              <div
                className="absolute flex items-center justify-center rounded-[18%]"
                style={{
                  left: `${(100 - LOGO_BACKING_PCT) / 2}%`,
                  top: `${(100 - LOGO_BACKING_PCT) / 2}%`,
                  width: `${LOGO_BACKING_PCT}%`,
                  height: `${LOGO_BACKING_PCT}%`,
                  background: BACKING_COLOR,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={EZTAB_LOGO_DATA_URI}
                  alt=""
                  style={{
                    width: `${(LOGO_PCT / LOGO_BACKING_PCT) * 100}%`,
                    height: `${(LOGO_PCT / LOGO_BACKING_PCT) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="mt-1 rounded-md bg-black/60 px-1.5 py-0.5 text-center text-[10px] text-white/90">
              {t("qrLabel")}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5">
          <h3 className="text-sm font-semibold text-ink">{t("sizeSection")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("widthCm")}
              </label>
              <input
                type="number"
                min={3}
                max={60}
                step={0.1}
                value={config.widthCm}
                onChange={(e) => updateConfig({ widthCm: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("heightCm")}
              </label>
              <input
                type="number"
                min={3}
                max={60}
                step={0.1}
                value={config.heightCm}
                onChange={(e) =>
                  updateConfig({ heightCm: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5">
          <h3 className="text-sm font-semibold text-ink">{t("cardIdSection")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("fontSize")}
              </label>
              <input
                type="number"
                min={4}
                max={200}
                step={0.5}
                value={config.cardIdFontSize}
                onChange={(e) =>
                  updateConfig({ cardIdFontSize: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-[11px] text-muted">{t("points")}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("color")}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={config.cardIdColor}
                  onChange={(e) => updateConfig({ cardIdColor: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-border"
                />
                <input
                  type="text"
                  value={config.cardIdColor}
                  onChange={(e) => updateConfig({ cardIdColor: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("xFraction")}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={config.cardIdX.toFixed(2)}
                onChange={(e) =>
                  updateConfig({
                    cardIdX: Math.min(1, Math.max(0, Number(e.target.value))),
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("yFraction")}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={config.cardIdY.toFixed(2)}
                onChange={(e) =>
                  updateConfig({
                    cardIdY: Math.min(1, Math.max(0, Number(e.target.value))),
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5">
          <h3 className="text-sm font-semibold text-ink">{t("qrSection")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("qrSize")}
              </label>
              <input
                type="number"
                min={16}
                max={400}
                step={1}
                value={config.qrSize}
                onChange={(e) => updateConfig({ qrSize: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-[11px] text-muted">{t("points")}</p>
            </div>
            <div />
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("xFraction")}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={config.qrX.toFixed(2)}
                onChange={(e) =>
                  updateConfig({
                    qrX: Math.min(1, Math.max(0, Number(e.target.value))),
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted">
                {t("yFraction")}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={config.qrY.toFixed(2)}
                onChange={(e) =>
                  updateConfig({
                    qrY: Math.min(1, Math.max(0, Number(e.target.value))),
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            id="print-design-upload"
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => document.getElementById("print-design-upload")?.click()}
            disabled={disabled}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {uploading ? t("uploading") : t("uploadDesign")}
          </Button>
          {localDesign && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveDesign}
              disabled={disabled}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {t("removeDesign")}
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={disabled}
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          {saving ? t("saving") : t("save")}
        </Button>
      </div>

      <p className="text-xs text-muted">{t("tip")}</p>
    </div>
  );
}
