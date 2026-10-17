import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getAdminContext } from "@/lib/auth/require-admin";
import { isValidCardId } from "@/lib/cards/ids";
import { getCardDestinationUrl } from "@/lib/cards/urls";
import { getPrintTemplate } from "@/lib/data/print-template";
import {
  isPrintTemplateKind,
  pageHeightPt,
  pageWidthPt,
  type PrintTemplateKind,
} from "@/lib/print/template";
import { downloadPrintDesign } from "@/lib/storage/print-designs";
import { detectImageType } from "@/lib/storage/profile-images";
import QRCode from "qrcode";
import { EZTAB_LOGO_DATA_URI } from "@/lib/qr/logo-data-uri";

// Same geometry as buildCardQrSvg (lib/qr/generate-qr-svg.ts): the logo
// occupies LOGO_SIZE_RATIO of the QR's full width (incl. its quiet-zone
// margin), on a backing square 1.35x that. High ("H") error correction
// tolerates this ~30% centre coverage while staying scannable.
const LOGO_SIZE_RATIO = 0.22;
const LOGO_BACKING_RATIO = 1.35;

/** Parse a CSS hex colour (#rrggbb) into RGB (0..1). */
function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex.trim());
  if (!m) return [0.0667, 0.0667, 0.0667]; // #111111
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  return [r, g, b];
}

/** Approximate PDF text baseline offset from top (for top-left anchor). */
const ASCENT_RATIO = 0.72;

/** Embed a `data:image/png;base64,…` URI as a PDF image, or null on failure. */
async function decodeDataUriPng(pdfDoc: PDFDocument, dataUri: string) {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUri);
  if (!match) return null;
  try {
    return await pdfDoc.embedPng(Buffer.from(match[1], "base64"));
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
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
    .select("card_id, type")
    .eq("card_id", cardId)
    .maybeSingle();

  if (error || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // The card's type picks the template; a `?template=` override lets the
  // editor preview either one against the sample card.
  const requested = new URL(request.url).searchParams.get("template");
  const kind: PrintTemplateKind = isPrintTemplateKind(requested)
    ? requested
    : card.type === "GOOGLE_REVIEW"
      ? "google_review"
      : "profile";

  const template = await getPrintTemplate(kind);
  const pageWidth = pageWidthPt(template);
  const pageHeight = pageHeightPt(template);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Background design (stretched to fill the page).
  if (template.designPath) {
    const bytes = await downloadPrintDesign(supabase, template.designPath);
    if (bytes) {
      const contentType = detectImageType(bytes);
      let embed = null;
      try {
        if (contentType === "image/png") {
          embed = await pdfDoc.embedPng(bytes);
        } else if (contentType === "image/jpeg") {
          embed = await pdfDoc.embedJpg(bytes);
        }
      } catch {
        embed = null;
      }
      if (embed) {
        page.drawImage(embed, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
    }
  }

  // Card ID
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const idColor = hexToRgb01(template.cardIdColor);
  const idFontSize = Math.max(4, template.cardIdFontSize);
  const idX = template.cardIdX * pageWidth;
  const idTopFromBottom = pageHeight - template.cardIdY * pageHeight;
  const idBaselineY = idTopFromBottom - idFontSize * ASCENT_RATIO;
  page.drawText(card.card_id, {
    x: idX,
    y: idBaselineY,
    size: idFontSize,
    font,
    color: rgb(idColor[0], idColor[1], idColor[2]),
  });

  // QR with EZTab logo centred in it
  const destinationUrl = getCardDestinationUrl(card);
  const qrSizePt = Math.max(16, template.qrSize);
  const qrPngBytes = await QRCode.toBuffer(destinationUrl, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width: Math.round(qrSizePt * 2.5),
  });
  const qrImage = await pdfDoc.embedPng(qrPngBytes);
  const qrXPt = template.qrX * pageWidth;
  const qrYTopFromBottom = pageHeight - template.qrY * pageHeight;
  const qrYBottomFromBottom = qrYTopFromBottom - qrSizePt;
  page.drawImage(qrImage, {
    x: qrXPt,
    y: qrYBottomFromBottom,
    width: qrSizePt,
    height: qrSizePt,
  });

  // Dark backing square + EZTab logo, matching buildCardQrSvg's overlay
  // (lib/qr/generate-qr-svg.ts) so the printed QR matches the QR panel.
  const logoSize = qrSizePt * LOGO_SIZE_RATIO;
  const backingSize = logoSize * LOGO_BACKING_RATIO;
  const centerX = qrXPt + qrSizePt / 2;
  const centerY = qrYBottomFromBottom + qrSizePt / 2;
  page.drawRectangle({
    x: centerX - backingSize / 2,
    y: centerY - backingSize / 2,
    width: backingSize,
    height: backingSize,
    color: rgb(21 / 255, 23 / 255, 31 / 255), // #15171F
  });
  const logoPng = await decodeDataUriPng(pdfDoc, EZTAB_LOGO_DATA_URI);
  if (logoPng) {
    page.drawImage(logoPng, {
      x: centerX - logoSize / 2,
      y: centerY - logoSize / 2,
      width: logoSize,
      height: logoSize,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const isDownload = new URL(request.url).searchParams.get("download") === "1";

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      ...(isDownload
        ? {
            "Content-Disposition": `attachment; filename="eztab-card-${card.card_id}.pdf"`,
          }
        : {}),
    },
  });
}
