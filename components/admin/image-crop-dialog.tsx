"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useTranslations } from "next-intl";
import { cropImageToBlob } from "@/lib/images/crop-image";
import { Button } from "@/components/ui/button";

/**
 * Modal crop step shown after a profile photo is picked, before it is
 * uploaded. Round frame (the saved image is still a square), drag to
 * reposition and a zoom slider to frame the face.
 */
export function ImageCropDialog({
  imageSrc,
  onCancel,
  onApply,
}: {
  imageSrc: string;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
}) {
  const t = useTranslations("links");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  const onCropComplete = useCallback((_region: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  async function handleApply() {
    if (!area || applying) return;
    setApplying(true);
    try {
      const blob = await cropImageToBlob(imageSrc, area);
      if (blob) {
        onApply(blob);
      } else {
        onCancel();
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("cropTitle")}
        className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5 shadow-xl"
      >
        <h2 className="text-sm font-semibold text-ink">{t("cropTitle")}</h2>
        <p className="mt-1 text-xs text-muted">{t("cropHint")}</p>

        <div className="relative mt-4 h-72 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className="mt-4 flex items-center gap-3 text-xs text-muted">
          <span className="shrink-0">{t("cropZoom")}</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1 w-full cursor-pointer accent-primary"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={applying}
          >
            {t("cropCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={applying || !area}
          >
            {t("cropApply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
