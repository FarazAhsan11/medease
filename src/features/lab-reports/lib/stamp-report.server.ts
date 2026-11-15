import "server-only";

import {
  degrees,
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import { signerLine, type LabSigner } from "@/features/lab-staff/lib/lab-staff";

// The sign-off stamp (LAB-17): two lines under every page, in a strip added
// below the lab's own content, so nothing the lab printed is covered or moved.
// Design: docs/lab-reports.md ("The stamp").

const STRIP = 26;
const MARGIN = 8;
const MAX_SIZE = 7;
const MIN_SIZE = 5;
const LINE_GAP = 2;

export class UnstampableReportError extends Error {}

// Standard PDF fonts print Windows-1252 only; the signer's details are already
// limited to it, so this only catches the date's special spaces.
const printable = (text: string) =>
  text.replace(/[ -​ ]/g, " ").replace(/[^\x20-\x7e\xa0-\xff]/g, "?");

function signedAt(at: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
    timeZoneName: "short",
  }).format(at);
}

export function stampLines(signer: LabSigner, at: Date, timeZone: string) {
  return [
    `Reviewed and signed off by ${signerLine(signer)}`,
    `Released electronically in MedEase on ${signedAt(at, timeZone)}`,
  ].map(printable);
}

// The largest size, down to MIN_SIZE, at which a line fits; shortened with an
// ellipsis on a page too narrow even for that.
function fit(font: PDFFont, line: string, width: number) {
  for (let size = MAX_SIZE; size >= MIN_SIZE; size -= 0.5) {
    if (font.widthOfTextAtSize(line, size) <= width) return { line, size };
  }
  let short = line;
  while (
    short.length > 1 &&
    font.widthOfTextAtSize(`${short}...`, MIN_SIZE) > width
  ) {
    short = short.slice(0, -1);
  }
  return { line: `${short}...`, size: MIN_SIZE };
}

// Grows the visible page by the strip on whichever edge is at the bottom as the
// page is shown (pages can be rotated), and writes the lines there, reading
// left to right.
function stampPage(page: PDFPage, font: PDFFont, lines: string[]) {
  const box = page.getCropBox();
  const angle = ((page.getRotation().angle % 360) + 360) % 360;
  const sideways = angle === 90 || angle === 270;
  const width = (sideways ? box.height : box.width) - 2 * MARGIN;
  const { x, y, width: w, height: h } = box;

  const grown =
    angle === 90
      ? { x, y, width: w + STRIP, height: h }
      : angle === 180
        ? { x, y, width: w, height: h + STRIP }
        : angle === 270
          ? { x: x - STRIP, y, width: w + STRIP, height: h }
          : { x, y: y - STRIP, width: w, height: h + STRIP };

  const media = page.getMediaBox();
  const left = Math.min(media.x, grown.x);
  const bottom = Math.min(media.y, grown.y);
  page.setMediaBox(
    left,
    bottom,
    Math.max(media.x + media.width, grown.x + grown.width) - left,
    Math.max(media.y + media.height, grown.y + grown.height) - bottom,
  );
  for (const set of [
    page.setCropBox,
    page.setTrimBox,
    page.setBleedBox,
    page.setArtBox,
  ]) {
    set.call(page, grown.x, grown.y, grown.width, grown.height);
  }

  // Baseline offsets from the strip's outer edge, last line nearest it.
  const fitted = lines.map((line) => fit(font, line, width));
  let offset = 6;
  for (const { line, size } of [...fitted].reverse()) {
    const at =
      angle === 90
        ? { x: x + w + STRIP - offset, y: y + MARGIN }
        : angle === 180
          ? { x: x + w - MARGIN, y: y + h + STRIP - offset }
          : angle === 270
            ? { x: x - STRIP + offset, y: y + h - MARGIN }
            : { x: x + MARGIN, y: y - STRIP + offset };
    page.drawText(line, {
      ...at,
      size,
      font,
      color: rgb(0.2, 0.2, 0.2),
      rotate: degrees(angle),
    });
    offset += size + LINE_GAP;
  }
}

// Returns a new PDF with the stamp on every page. A locked or broken file
// can't be stamped: the signer sends it back for a new copy.
export async function stampSignOff(
  file: Uint8Array,
  lines: string[],
): Promise<Uint8Array> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(file, { updateMetadata: false });
  } catch {
    throw new UnstampableReportError();
  }
  const pages = pdf.getPages();
  if (pages.length === 0) throw new UnstampableReportError();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const page of pages) stampPage(page, font, lines);
  return pdf.save();
}
