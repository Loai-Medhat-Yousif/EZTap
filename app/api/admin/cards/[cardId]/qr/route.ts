import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/auth/require-admin";
import { isValidCardId } from "@/lib/cards/ids";
import { buildCardQrSvg } from "@/lib/qr/generate-qr-svg";
import { getCardDestinationUrl } from "@/lib/cards/urls";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  // app/api/** isn't covered by proxy.ts's matcher (deliberately — see
  // proxy.ts), so this route checks the session itself. Anyone could
  // otherwise regenerate any card's QR by guessing a 6-digit card_id.
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase } = context;

  const { cardId } = await params;
  if (!isValidCardId(cardId)) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const { data: card, error } = await supabase
    .from("cards")
    .select("card_id")
    .eq("card_id", cardId)
    .maybeSingle();

  if (error || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // The QR always encodes the card's stable /card/{id} URL — never the
  // card's current target — so editing a profile, a link, or the Google
  // Review URL never changes the printed pattern. See lib/cards/urls.ts.
  const destinationUrl = getCardDestinationUrl(card);
  const svg = await buildCardQrSvg(destinationUrl);

  const isDownload = new URL(request.url).searchParams.get("download") === "1";

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
      ...(isDownload
        ? {
            "Content-Disposition": `attachment; filename="eztab-card-${card.card_id}.svg"`,
          }
        : {}),
    },
  });
}
