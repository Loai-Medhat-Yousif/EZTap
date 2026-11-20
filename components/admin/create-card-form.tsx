"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  RefreshCw,
  CreditCard,
  Star,
  Store,
  Landmark,
  Banknote,
  Wallet,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  profileDetailsSchema,
  targetUrlSchema,
  storeDetailsSchema,
  paymentDetailsSchema,
  menuDetailsSchema,
  type ProfileDetailsInput,
  type ProfileDetailsFormInput,
  type TargetUrlInput,
  type StoreDetailsInput,
  type StoreDetailsFormInput,
  type PaymentDetailsInput,
  type PaymentDetailsFormInput,
  type MenuDetailsInput,
  type MenuDetailsFormInput,
} from "@/lib/validation/cards";
import { createCard, previewNewCardId } from "@/app/admin/cards/actions";
import { GoogleMapsReviewHelper } from "@/components/admin/google-maps-review-helper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { ProfileFields } from "@/components/admin/profile-fields";
import { StoreFields } from "@/components/admin/store-fields";
import { PaymentFields } from "@/components/admin/payment-fields";
import { MenuFields } from "@/components/admin/menu-fields";
import { cn } from "@/lib/utils";
import type { CardType } from "@/types";

type CardTypeChoice = CardType;
type RedirectChoice = "GOOGLE_REVIEW" | "INSTAPAY" | "ONLINE_CASH";

const TYPE_OPTIONS: {
  key: CardTypeChoice;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}[] = [
  {
    key: "PROFILE",
    icon: CreditCard,
    titleKey: "profileCardTitle",
    descKey: "profileCardDescription",
  },
  {
    key: "STORE_PROFILE",
    icon: Store,
    titleKey: "storeCardTitle",
    descKey: "storeCardDescription",
  },
  {
    key: "MULTIPLE_PAYMENT_METHODS",
    icon: Wallet,
    titleKey: "paymentCardTitle",
    descKey: "paymentCardDescription",
  },
  {
    key: "MENU",
    icon: UtensilsCrossed,
    titleKey: "menuCardTitle",
    descKey: "menuCardDescription",
  },
  {
    key: "GOOGLE_REVIEW",
    icon: Star,
    titleKey: "googleReviewCardTitle",
    descKey: "googleReviewCardDescription",
  },
  {
    key: "INSTAPAY",
    icon: Landmark,
    titleKey: "instapayCardTitle",
    descKey: "instapayCardDescription",
  },
  {
    key: "ONLINE_CASH",
    icon: Banknote,
    titleKey: "onlineCashCardTitle",
    descKey: "onlineCashCardDescription",
  },
];

const REDIRECT_LABEL_KEY: Record<RedirectChoice, string> = {
  GOOGLE_REVIEW: "googleReviewUrlLabel",
  INSTAPAY: "instapayUrlLabel",
  ONLINE_CASH: "onlineCashUrlLabel",
};

export function CreateCardForm({
  initialCardId,
  previewError = null,
}: {
  initialCardId: string;
  previewError?: string | null;
}) {
  const t = useTranslations("cards");
  const [type, setType] = useState<CardTypeChoice>("PROFILE");
  const [cardId, setCardId] = useState(initialCardId);
  const [idError, setIdError] = useState<string | null>(previewError);
  const [isRegenerating, startRegenerate] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const profileForm = useForm<ProfileDetailsFormInput, unknown, ProfileDetailsInput>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: { fullName: "" },
  });

  const targetForm = useForm<TargetUrlInput>({
    resolver: zodResolver(targetUrlSchema),
    defaultValues: { targetUrl: "" },
  });

  const storeForm = useForm<
    StoreDetailsFormInput,
    unknown,
    StoreDetailsInput
  >({
    resolver: zodResolver(storeDetailsSchema),
    defaultValues: { fullName: "" },
  });

  const paymentForm = useForm<
    PaymentDetailsFormInput,
    unknown,
    PaymentDetailsInput
  >({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: { fullName: "" },
  });

  const menuForm = useForm<
    MenuDetailsFormInput,
    unknown,
    MenuDetailsInput
  >({
    resolver: zodResolver(menuDetailsSchema),
    defaultValues: { fullName: "" },
  });

  function regenerate() {
    startRegenerate(async () => {
      const result = await previewNewCardId();
      if (!result.cardId) {
        setIdError(result.error ?? "Couldn't generate a card ID. Try again.");
        return;
      }
      setIdError(null);
      setCardId(result.cardId);
    });
  }

  function submitRedirect(redirectType: RedirectChoice) {
    return targetForm.handleSubmit((values) => {
      setFormError(null);
      startSubmit(async () => {
        const result = await createCard({
          type: redirectType,
          targetUrl: values.targetUrl,
        });
        if (result?.error) setFormError(result.error);
      });
    });
  }

  const submitProfile = profileForm.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await createCard({ type: "PROFILE", ...values });
      if (result?.error) setFormError(result.error);
    });
  });

  const submitStore = storeForm.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await createCard({ type: "STORE_PROFILE", ...values });
      if (result?.error) setFormError(result.error);
    });
  });

  const submitPayment = paymentForm.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await createCard({
        type: "MULTIPLE_PAYMENT_METHODS",
        ...values,
      });
      if (result?.error) setFormError(result.error);
    });
  });

  const submitMenu = menuForm.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await createCard({ type: "MENU", ...values });
      if (result?.error) setFormError(result.error);
    });
  });

  let formBody: ReactNode;
  if (type === "PROFILE") {
    formBody = (
      <form onSubmit={submitProfile} noValidate className="space-y-5">
        <ProfileFields
          register={profileForm.register}
          errors={profileForm.formState.errors}
        />
        <FieldError>{formError}</FieldError>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("creating") : t("createButton")}
        </Button>
      </form>
    );
  } else if (type === "STORE_PROFILE") {
    formBody = (
      <form onSubmit={submitStore} noValidate className="space-y-5">
        <StoreFields
          register={storeForm.register}
          errors={storeForm.formState.errors}
          setValue={storeForm.setValue}
        />
        <FieldError>{formError}</FieldError>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("creating") : t("createButton")}
        </Button>
      </form>
    );
  } else if (type === "MULTIPLE_PAYMENT_METHODS") {
    formBody = (
      <form onSubmit={submitPayment} noValidate className="space-y-5">
        <PaymentFields
          register={paymentForm.register}
          errors={paymentForm.formState.errors}
        />
        <FieldError>{formError}</FieldError>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("creating") : t("createButton")}
        </Button>
      </form>
    );
  } else if (type === "MENU") {
    formBody = (
      <form onSubmit={submitMenu} noValidate className="space-y-5">
        <MenuFields
          register={menuForm.register}
          errors={menuForm.formState.errors}
          setValue={menuForm.setValue}
        />
        <FieldError>{formError}</FieldError>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("creating") : t("createButton")}
        </Button>
      </form>
    );
  } else {
    formBody = (
      <form onSubmit={submitRedirect(type)} noValidate className="space-y-5">
        {type === "GOOGLE_REVIEW" && (
          <GoogleMapsReviewHelper
            onGenerated={(url) =>
              targetForm.setValue("targetUrl", url, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
        )}

        <div>
          <Label htmlFor="targetUrl">{t(REDIRECT_LABEL_KEY[type])}</Label>
          <Input
            id="targetUrl"
            type="url"
            placeholder={
              type === "GOOGLE_REVIEW" ? "https://g.page/r/.../review" : "https://"
            }
            aria-invalid={!!targetForm.formState.errors.targetUrl}
            {...targetForm.register("targetUrl")}
          />
          <FieldError>
            {targetForm.formState.errors.targetUrl?.message}
          </FieldError>
        </div>
        <FieldError>{formError}</FieldError>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("creating") : t("createButton")}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>{t("chooseType")}</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TYPE_OPTIONS.map(({ key, icon: Icon, titleKey, descKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setType(key);
                setFormError(null);
              }}
              aria-pressed={type === key}
              className={cn(
                "rounded-xl border p-4 text-start transition-colors",
                type === key
                  ? "border-primary bg-primary-tint"
                  : "border-border hover:bg-surface",
              )}
            >
              <Icon className="mb-2 h-5 w-5 text-primary" aria-hidden />
              <p className="text-sm font-medium text-ink">{t(titleKey)}</p>
              <p className="text-xs text-muted">{t(descKey)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-xs text-muted">{t("cardIdLabel")}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
            {cardId}
          </p>
          <FieldError>{idError}</FieldError>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={regenerate}
          disabled={isRegenerating}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")}
            aria-hidden
          />
          {t("regenerateId")}
        </Button>
      </div>

      {formBody}
    </div>
  );
}
