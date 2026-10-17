import { getTranslations } from "next-intl/server";
import { Link2Off, Clock, CheckCircle2 } from "lucide-react";
import { openEditSession } from "@/lib/cards/edit-session";
import { CustomerEditView } from "@/components/profile/customer-edit-view";

// The session is opened (and a timestamp written) on first view, so this
// route must never be prerendered or cached.
export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

const STATUS_ICON = {
  invalid: Link2Off,
  closed: CheckCircle2,
  expired: Clock,
} as const;

export default async function EditPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await openEditSession(token);

  if (session.status === "open") {
    return (
      <CustomerEditView
        token={token}
        card={session.card}
        expiresAt={session.expiresAt}
      />
    );
  }

  const t = await getTranslations("editLink");
  const copy = {
    invalid: { title: t("invalidTitle"), message: t("invalidMessage") },
    closed: { title: t("closedTitle"), message: t("closedMessage") },
    expired: { title: t("expiredTitle"), message: t("expiredMessage") },
  }[session.status];
  const Icon = STATUS_ICON[session.status];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-raised">
        <Icon className="h-7 w-7 text-muted" aria-hidden />
      </span>
      <h1 className="text-xl font-semibold text-ink">{copy.title}</h1>
      <p className="text-sm text-muted">{copy.message}</p>
    </div>
  );
}
