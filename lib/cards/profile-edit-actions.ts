import type {
  MenuCategoryInput,
  MenuDetailsInput,
  MenuItemInput,
  MenuOfferInput,
  PaymentDetailsInput,
  ProfileDetailsInput,
  ProfileLinkInput,
  StoreDetailsInput,
} from "@/lib/validation/cards";
import type { CardTheme } from "@/types";

/**
 * The shape both the admin card editor and the temporary customer edit
 * page use to drive the shared editor components. `scope` is a card ID
 * for the admin and an edit token for the customer — each action bundle
 * interprets it, so the components never need to know which side they're
 * on. Server Actions are serializable across the RSC boundary, so the
 * edit page passes its bundle down as a prop; the admin components
 * default to the real admin actions.
 *
 * The link methods are shared verbatim between personal profiles and
 * stores: `ProfileLinksManager` / `LinkForm` only ever call these, so a
 * store edits its links through the exact same components by passing a
 * bundle whose link methods point at the store mutations.
 *
 * `reorderProfileLinks` takes the whole desired order rather than a
 * single move: the links manager reorders locally (drag and drop) and
 * saves the finished order in one request, instead of one round trip per
 * arrow click.
 */
export type LinkEditActions = {
  addProfileLink: (
    scope: string,
    input: ProfileLinkInput,
  ) => Promise<{ error?: string }>;
  updateProfileLink: (
    scope: string,
    linkId: string,
    input: ProfileLinkInput,
  ) => Promise<{ error?: string }>;
  deleteProfileLink: (
    scope: string,
    linkId: string,
  ) => Promise<{ error?: string }>;
  setProfileLinkActive: (
    scope: string,
    linkId: string,
    isActive: boolean,
  ) => Promise<{ error?: string }>;
  reorderProfileLinks: (
    scope: string,
    orderedIds: string[],
  ) => Promise<{ error?: string }>;
};

/**
 * The theme picker is card-level (not profile/store-level), so it gets
 * its own small bundle instead of being folded into the profile and
 * store bundles. `scope` is a card ID for the admin and an edit token for
 * the customer, exactly like the other shared editors.
 */
export type CardThemeEditActions = {
  updateCardTheme: (
    scope: string,
    theme: CardTheme,
  ) => Promise<{ error?: string }>;
};

/** The image half, shared by profiles and stores (`ProfileImageUpload`
 * only ever calls these two). */
export type ImageEditActions = {
  uploadProfileImageAction: (
    scope: string,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  removeProfileImageAction: (scope: string) => Promise<{ error?: string }>;
};

export type ProfileEditActions = LinkEditActions &
  ImageEditActions & {
    updateProfileDetails: (
      scope: string,
      input: ProfileDetailsInput,
    ) => Promise<{ error?: string }>;
  };

/**
 * The store equivalent. Methods keep the same names as the profile
 * bundle (`uploadProfileImageAction`, the link methods, ...) on purpose:
 * the store passes this where the shared components expect a profile
 * bundle, and the shared components light up unchanged. `scope` is a
 * store card's ID (admin) or its edit token (customer).
 */
export type StoreEditActions = LinkEditActions &
  ImageEditActions & {
    updateStoreDetails: (
      scope: string,
      input: StoreDetailsInput,
    ) => Promise<{ error?: string }>;
  };

/**
 * The multiple-payment-methods equivalent. It keeps the same shared link
 * and image method names so `ProfileLinksManager` and `ProfileImageUpload`
 * work unchanged; only the details call differs. `scope` is a payment
 * card's ID (admin) or its edit token (customer).
 */
export type PaymentEditActions = LinkEditActions &
  ImageEditActions & {
    updatePaymentDetails: (
      scope: string,
      input: PaymentDetailsInput,
    ) => Promise<{ error?: string }>;
  };

export type MenuEditActions = ImageEditActions & {
  updateMenuDetails: (
    scope: string,
    input: MenuDetailsInput,
  ) => Promise<{ error?: string }>;
  addMenuCategory: (
    scope: string,
    input: MenuCategoryInput,
  ) => Promise<{ error?: string }>;
  updateMenuCategory: (
    scope: string,
    categoryId: string,
    input: MenuCategoryInput,
  ) => Promise<{ error?: string }>;
  deleteMenuCategory: (
    scope: string,
    categoryId: string,
  ) => Promise<{ error?: string }>;
  reorderMenuCategories: (
    scope: string,
    orderedIds: string[],
  ) => Promise<{ error?: string }>;
  addMenuItem: (
    scope: string,
    input: MenuItemInput,
  ) => Promise<{ error?: string }>;
  updateMenuItem: (
    scope: string,
    itemId: string,
    input: MenuItemInput,
  ) => Promise<{ error?: string }>;
  deleteMenuItem: (
    scope: string,
    itemId: string,
  ) => Promise<{ error?: string }>;
  reorderMenuItems: (
    scope: string,
    categoryId: string,
    orderedIds: string[],
  ) => Promise<{ error?: string }>;
  uploadMenuItemImage: (
    scope: string,
    itemId: string,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  removeMenuItemImage: (
    scope: string,
    itemId: string,
  ) => Promise<{ error?: string }>;
  addMenuOffer: (
    scope: string,
    input: MenuOfferInput,
  ) => Promise<{ error?: string }>;
  updateMenuOffer: (
    scope: string,
    offerId: string,
    input: MenuOfferInput,
  ) => Promise<{ error?: string }>;
  deleteMenuOffer: (
    scope: string,
    offerId: string,
  ) => Promise<{ error?: string }>;
  reorderMenuOffers: (
    scope: string,
    orderedIds: string[],
  ) => Promise<{ error?: string }>;
  uploadMenuOfferImage: (
    scope: string,
    offerId: string,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  removeMenuOfferImage: (
    scope: string,
    offerId: string,
  ) => Promise<{ error?: string }>;
};
