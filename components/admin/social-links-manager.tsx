"use client";

import {
  addSocialLink,
  updateSocialLink,
  deleteSocialLink,
  setSocialLinkActive,
  reorderSocialLinks,
} from "@/app/admin/settings/actions";
import type { LinkEditActions } from "@/lib/cards/profile-edit-actions";
import type { SocialLink } from "@/types";
import { ProfileLinksManager } from "@/components/admin/profile-links-manager";

/**
 * Social links reuse the exact link manager a card uses (icon picker,
 * add/edit/delete, reorder, active toggle). The only difference is that
 * social links are global — there's no card to scope them to — so the
 * action bundle ignores the `scope` argument and calls the settings
 * actions directly, mapping the manager's `title` onto the social
 * link's `label`.
 */
const actions: LinkEditActions = {
  addProfileLink: (_scope, input) =>
    addSocialLink({ icon: input.icon, label: input.title, url: input.url }),
  updateProfileLink: (_scope, linkId, input) =>
    updateSocialLink(linkId, {
      icon: input.icon,
      label: input.title,
      url: input.url,
    }),
  deleteProfileLink: (_scope, linkId) => deleteSocialLink(linkId),
  setProfileLinkActive: (_scope, linkId, isActive) =>
    setSocialLinkActive(linkId, isActive),
  reorderProfileLinks: (_scope, orderedIds) => reorderSocialLinks(orderedIds),
};

export function SocialLinksManager({ links }: { links: SocialLink[] }) {
  return (
    <ProfileLinksManager
      scope="site"
      actions={actions}
      links={links.map((link) => ({
        id: link.id,
        icon: link.icon,
        title: link.label,
        url: link.url,
        is_active: link.is_active,
      }))}
    />
  );
}
