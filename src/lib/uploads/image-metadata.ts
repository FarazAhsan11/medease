// Removes metadata from uploaded photos without re-encoding them: location,
// camera and owner details, comments, embedded thumbnails and anything
// appended after the image. Kept: what's needed to show the picture as taken
// (JPEG colour profile and Adobe colour data, and the rotation, rewritten as a
// one-entry EXIF block so phone photos don't turn sideways).
//
// Returns null when the file isn't a well-formed image of its type: the upload
// is then refused rather than stored unchecked.

export type StrippedImage = { bytes: Uint8Array; changed: boolean };

export function stripImageMetadata(
  bytes: Uint8Array,
  type: string,
): StrippedImage | null {
  if (type === "image/jpeg") return stripJpeg(bytes);
  if (type === "image/png") return stripPng(bytes);
  if (type === "image/webp") return stripWebp(bytes);
  return { bytes, changed: false };
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const text = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const startsWithText = (bytes: Uint8Array, prefix: string) =>
  bytes.length >= prefix.length && text(bytes, 0, prefix.length) === prefix;

// JPEG ----------------------------------------------------------------------

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;
const COM = 0xfe;

// APPn segments to keep; every other APPn and every comment is dropped.
function isKeptAppSegment(marker: number, data: Uint8Array) {
  if (marker === 0xe0) return startsWithText(data, "JFIF\0");
  if (marker === 0xe2) return startsWithText(data, "ICC_PROFILE\0");
  if (marker === 0xee) return startsWithText(data, "Adobe");
  return false;
}

function stripJpeg(bytes: Uint8Array): StrippedImage | null {
  if (bytes[0] !== 0xff || bytes[1] !== SOI) return null;

  const kept: Uint8Array[] = [];
  let orientation: number | null = null;
  let changed = false;
  let offset = 2;

  while (true) {
    if (bytes[offset] !== 0xff) return null;
    let markerAt = offset + 1;
    while (bytes[markerAt] === 0xff) markerAt++; // fill bytes
    const marker = bytes[markerAt];
    if (marker === undefined) return null;
    const afterMarker = markerAt + 1;

    if (marker === EOI) {
      kept.push(bytes.subarray(offset, afterMarker));
      offset = afterMarker;
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(bytes.subarray(offset, afterMarker));
      offset = afterMarker;
      continue;
    }

    if (afterMarker + 2 > bytes.length) return null;
    const length = (bytes[afterMarker] << 8) | bytes[afterMarker + 1];
    const end = afterMarker + length;
    if (length < 2 || end > bytes.length) return null;

    if (marker === SOS) {
      // Image data runs to the first EOI: inside it a 0xFF byte is always
      // followed by 0x00 or a restart marker, so the first FF D9 ends the
      // image. Whatever follows (motion-photo video, extra frames) is dropped.
      const eoi = findEoi(bytes, end);
      if (eoi === -1) return null;
      kept.push(bytes.subarray(offset, eoi + 2));
      offset = eoi + 2;
      break;
    }

    const data = bytes.subarray(afterMarker + 2, end);
    const isMetadata =
      marker === COM ||
      (marker >= 0xe0 && marker <= 0xef && !isKeptAppSegment(marker, data));
    if (isMetadata) {
      if (marker === 0xe1 && orientation === null) {
        orientation = readExifOrientation(data);
      }
      changed = true;
    } else {
      kept.push(bytes.subarray(offset, end));
    }
    offset = end;
  }

  if (offset < bytes.length) changed = true;
  if (!changed) return { bytes, changed: false };

  const head: Uint8Array[] = [bytes.subarray(0, 2)];
  // JFIF comes first when present; the rotation follows it.
  const [first, ...rest] = kept;
  const jfifFirst = first?.[1] === 0xe0;
  if (jfifFirst) head.push(first);
  if (orientation !== null && orientation !== 1) {
    head.push(orientationSegment(orientation));
  }
  return {
    bytes: concat([...head, ...(jfifFirst ? rest : kept)]),
    changed: true,
  };
}

function findEoi(bytes: Uint8Array, from: number) {
  for (let index = from; index < bytes.length - 1; index++) {
    if (bytes[index] === 0xff && bytes[index + 1] === EOI) return index;
  }
  return -1;
}

// Reads tag 0x0112 from IFD0 of an "Exif\0\0" APP1 block.
function readExifOrientation(data: Uint8Array): number | null {
  if (!startsWithText(data, "Exif\0\0")) return null;
  const tiff = data.subarray(6);
  if (tiff.length < 8) return null;
  const order = text(tiff, 0, 2);
  if (order !== "II" && order !== "MM") return null;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const little = order === "II";
  const ifd = view.getUint32(4, little);
  if (ifd + 2 > tiff.length) return null;
  const count = view.getUint16(ifd, little);
  for (let entry = 0; entry < count; entry++) {
    const at = ifd + 2 + entry * 12;
    if (at + 12 > tiff.length) return null;
    if (view.getUint16(at, little) === 0x0112) {
      const value = view.getUint16(at + 8, little);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

// An APP1 block holding nothing but the rotation.
function orientationSegment(orientation: number) {
  return Uint8Array.from([
    0xff,
    0xe1,
    0x00,
    0x22, // APP1, length 34
    0x45,
    0x78,
    0x69,
    0x66,
    0x00,
    0x00, // "Exif\0\0"
    0x4d,
    0x4d,
    0x00,
    0x2a,
    0x00,
    0x00,
    0x00,
    0x08, // big-endian TIFF, IFD0 at 8
    0x00,
    0x01, // one entry
    0x01,
    0x12,
    0x00,
    0x03,
    0x00,
    0x00,
    0x00,
    0x01, // Orientation, SHORT, 1 value
    0x00,
    orientation,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00, // no next IFD
  ]);
}

// PNG -----------------------------------------------------------------------

const PNG_METADATA = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

function stripPng(bytes: Uint8Array): StrippedImage | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  let changed = false;
  let offset = 8;

  while (true) {
    if (offset + 12 > bytes.length) return null;
    const length = view.getUint32(offset);
    const type = text(bytes, offset + 4, 4);
    const end = offset + 12 + length;
    if (end > bytes.length) return null;

    if (PNG_METADATA.has(type)) changed = true;
    else kept.push(bytes.subarray(offset, end));
    offset = end;
    if (type === "IEND") break;
  }

  if (offset < bytes.length) changed = true;
  return changed ? { bytes: concat(kept), changed } : { bytes, changed };
}

// WebP ----------------------------------------------------------------------

const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

function stripWebp(bytes: Uint8Array): StrippedImage | null {
  if (bytes.length < 12) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riffEnd = 8 + view.getUint32(4, true);
  if (riffEnd > bytes.length) return null;

  const kept: Uint8Array[] = [];
  let changed = riffEnd < bytes.length;
  let offset = 12;

  while (offset < riffEnd) {
    if (offset + 8 > riffEnd) return null;
    const type = text(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const end = offset + 8 + size + (size % 2);
    if (end > riffEnd) return null;

    if (type === "EXIF" || type === "XMP ") {
      changed = true;
    } else if (type === "VP8X" && size > 0) {
      const chunk = bytes.slice(offset, end);
      if (chunk[8] & (VP8X_EXIF | VP8X_XMP)) {
        chunk[8] &= ~(VP8X_EXIF | VP8X_XMP);
        changed = true;
      }
      kept.push(chunk);
    } else {
      kept.push(bytes.subarray(offset, end));
    }
    offset = end;
  }

  if (!changed) return { bytes, changed: false };
  const body = concat(kept);
  const header = new Uint8Array(12);
  header.set(bytes.subarray(0, 4));
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  header.set(bytes.subarray(8, 12), 8);
  return { bytes: concat([header, body]), changed: true };
}
