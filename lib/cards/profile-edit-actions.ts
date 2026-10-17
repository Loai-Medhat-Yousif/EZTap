import type { ProfileDetailsInput, ProfileLinkInput } from "@/lib/validation/cards";

/**
 * The shape both the admin card editor and the temporary customer edit
 * page use to drive the shared profile components. `scope` is a card ID
 * for the admin and an edit token for the customer — each action bundle
 * interprets it, so the components never need to know which side they're
 * on. Server Actions are serializable across the RSC boundary, so the
 * edit page passes its bundle down as a prop; the admin components
 * default to the real admin actions.
 */
export type ProfileEditActions = {
  updateProfileDetails: (
    scope: string,
    input: ProfileDetailsInput,
  ) => Promise<{ error?: string }>;
  uploadProfileImageAction: (
    scope: string,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  removeProfileImageAction: (scope: string) => Promise<{ error?: string }>;
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
  moveProfileLink: (
    scope: string,
    linkId: string,
    direction: "up" | "down",
  ) => Promise<{ error?: string }>;
};
