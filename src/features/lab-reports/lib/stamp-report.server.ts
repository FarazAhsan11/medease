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

// The sign-off stamp (LAB-17): lines under every page, in a strip added below
// the lab's own content, so nothing the lab printed is covered or moved. A
// correction (LAB-18) adds what it replaces and why. Design:
// docs/lab-reports.md ("The stamp").

// The strip's padding: with two 7pt lines it's 26pt tall.
const PADDING = 8;
// A line too long for the page wraps onto at most this many.
const MAX_WRAPPED_LINES = 3;
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

// What a correction prints: why, and when the report it replaces was
// released, so a reader can tell the two apart (ISO 15189:2022, 7.4.1.8).
export type StampCorrection = {
  reason: string;
  replacesReleasedAt: string;
};

export function stampLines(
  signer: LabSigner,
  at: Date,
  timeZone: string,
  correction?: StampCorrection | null,
) {
  return [
    ...(correction
      ? [
          `CORRECTED REPORT. It replaces the report released on ${signedAt(new Date(correction.replacesReleasedAt), timeZone)}.`,
          `Reason for correction: ${correction.reason}`,
        ]
      : []),
    `Reviewed and signed off by ${signerLine(signer)}`,
    `Released electronically in MedEase on ${signedAt(at, timeZone)}`,
  ].map(printable);
}

// The largest size, down to MIN_SIZE, at which a line fits; on a page too
// narrow even for that, wrapped at MIN_SIZE onto up to MAX_WRAPPED_LINES.
function fit(font: PDFFont, line: string, width: number) {
  for (let size = MAX_SIZE; size >= MIN_SIZE; size -= 0.5) {
    if (font.widthOfTextAtSize(line, size) <= width) return [{ line, size }];
  }
  const wrapped: string[] = [];
  let rest = line;
  while (rest && wrapped.length < MAX_WRAPPED_LINES - 1) {
    const words = rest.split(" ");
    let taken = words[0];
    let count = 1;
    while (
      count < words.length &&
      font.widthOfTextAtSize(`${taken} ${words[count]}`, MIN_SIZE) <= width
    ) {
      taken = `${taken} ${words[count]}`;
      count++;
    }
    // A single word too wide for the page is shortened below.
    if (font.widthOfTextAtSize(taken, MIN_SIZE) > width) break;
    wrapped.push(taken);
    rest = words.slice(count).join(" ");
  }
  if (!rest) return wrapped.map((part) => ({ line: part, size: MIN_SIZE }));
  if (font.widthOfTextAtSize(rest, MIN_SIZE) <= width) {
    return [...wrapped, rest].map((part) => ({ line: part, size: MIN_SIZE }));
  }
  return [
    ...wrapped.map((part) => ({ line: part, size: MIN_SIZE })),
    shorten(font, rest, width),
  ];
}

// Cut with an ellipsis to fit at MIN_SIZE.
function shorten(font: PDFFont, line: string, width: number) {
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
  const fitted = lines.flatMap((line) => fit(font, line, width));
  const strip =
    PADDING + fitted.reduce((total, { size }) => total + size + LINE_GAP, 0);

  const grown =
    angle === 90
      ? { x, y, width: w + strip, height: h }
      : angle === 180
        ? { x, y, width: w, height: h + strip }
        : angle === 270
          ? { x: x - strip, y, width: w + strip, height: h }
          : { x, y: y - strip, width: w, height: h + strip };

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
  let offset = 6;
  for (const { line, size } of [...fitted].reverse()) {
    const at =
      angle === 90
        ? { x: x + w + strip - offset, y: y + MARGIN }
        : angle === 180
          ? { x: x + w - MARGIN, y: y + h + strip - offset }
          : angle === 270
            ? { x: x - strip + offset, y: y + h - MARGIN }
            : { x: x + MARGIN, y: y - strip + offset };
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
