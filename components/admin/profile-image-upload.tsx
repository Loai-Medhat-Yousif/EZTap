"use client";

import { useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ImageIcon, Upload, Trash2 } from "lucide-react";
import * as adminActions from "@/app/admin/cards/actions";
import type { ProfileEditActions } from "@/lib/cards/profile-edit-actions";
import { compressImageForUpload } from "@/lib/images/compress-image";
import { ImageCropDialog } from "@/components/admin/image-crop-dialog";
import { Button } from "@/components/ui/button";

export function ProfileImageUpload({
  scope,
  imageUrl,
  actions = adminActions,
}: {
  scope: string;
  imageUrl: string | null;
  actions?: ProfileEditActions;
}) {
  const t = useTranslations("links");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    // Hand the picked file to the crop dialog; nothing is uploaded until
    // the admin frames the shot and confirms.
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleCropApply(blob: Blob) {
    const cropped = new File([blob], "photo.webp", {
      type: blob.type || "image/webp",
      lastModified: Date.now(),
    });
    closeCrop();

    startTransition(async () => {
      // The 512px crop is usually already small, but shrink anyway if a
      // high-DPI crop lands over the 5MB bucket limit.
      const compressed = await compressImageForUpload(cropped);
      if ("error" in compressed) {
        setError(compressed.error);
        return;
      }

      const formData = new FormData();
      formData.set("file", compressed.file);

      const result = await actions.uploadProfileImageAction(scope, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success(t("photoUpdated"));
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await actions.removeProfileImageAction(scope);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success(t("photoRemoved"));
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
        {imageUrl ? (
          // Supabase Storage URL, not a static asset next/image can optimize.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted" aria-hidden />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {isPending ? t("saving") : t("uploadPhoto")}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {t("removePhoto")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">{t("photoHint")}</p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {cropSrc && (
        <ImageCropDialog
          imageSrc={cropSrc}
          onCancel={closeCrop}
          onApply={handleCropApply}
        />
      )}
    </div>
  );
}
