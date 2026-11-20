import type { CardType } from "@/types";

/**
 * The i18n key (in the `cards` namespace) for each card type's display
 * name. One source of truth so the create form, the cards table, the
 * filters, the detail page, and the dashboard lists can never disagree
 * about what a type is called.
 */
export const CARD_TYPE_LABEL_KEY: Record<CardType, string> = {
  PROFILE: "typeProfile",
  STORE_PROFILE: "typeStore",
  GOOGLE_REVIEW: "typeGoogleReview",
  INSTAPAY: "typeInstapay",
  ONLINE_CASH: "typeOnlineCash",
  MULTIPLE_PAYMENT_METHODS: "typeMultiplePaymentMethods",
  MENU: "typeMenu",
};
