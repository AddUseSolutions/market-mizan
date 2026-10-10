/**
 * Minimal JPEG EXIF GPS reader — returns { lat, lng } or null.
 * Only the first 256 KB are read; EXIF lives in the APP1 segment near the file start.
 */
const MAX_BYTES = 256 * 1024;

function readRational(view, offset, little) {
  const num = view.getUint32(offset, little);
  const den = view.getUint32(offset + 4, little);
  return den ? num / den : 0;
}

function readDms(view, tiffStart, valueOffset, little) {
  const base = tiffStart + view.getUint32(valueOffset, little);
  return (
    readRational(view, base, little) +
    readRational(view, base + 8, little) / 60 +
    readRational(view, base + 16, little) / 3600
  );
}

function findTag(view, tiffStart, ifdOffset, little, tag) {
  const dirStart = tiffStart + ifdOffset;
  if (dirStart + 2 > view.byteLength) return null;
  const entries = view.getUint16(dirStart, little);
  for (let i = 0; i < entries; i += 1) {
    const entry = dirStart + 2 + i * 12;
    if (entry + 12 > view.byteLength) return null;
    if (view.getUint16(entry, little) === tag) return entry;
  }
  return null;
}

function parseGps(view, tiffStart) {
  const byteOrder = view.getUint16(tiffStart);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) return null;

  const ifd0 = view.getUint32(tiffStart + 4, little);
  const gpsPtr = findTag(view, tiffStart, ifd0, little, 0x8825);
  if (gpsPtr == null) return null;
  const gpsIfd = view.getUint32(gpsPtr + 8, little);

  const latRefEntry = findTag(view, tiffStart, gpsIfd, little, 0x0001);
  const latEntry = findTag(view, tiffStart, gpsIfd, little, 0x0002);
  const lngRefEntry = findTag(view, tiffStart, gpsIfd, little, 0x0003);
  const lngEntry = findTag(view, tiffStart, gpsIfd, little, 0x0004);
  if (latEntry == null || lngEntry == null) return null;

  let lat = readDms(view, tiffStart, latEntry + 8, little);
  let lng = readDms(view, tiffStart, lngEntry + 8, little);
  if (latRefEntry != null && String.fromCharCode(view.getUint8(latRefEntry + 8)) === "S") lat = -lat;
  if (lngRefEntry != null && String.fromCharCode(view.getUint8(lngRefEntry + 8)) === "W") lng = -lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

export async function readExifGps(file) {
  try {
    if (!file || !/jpe?g/i.test(file.type || file.name || "")) return null;
    const buffer = await file.slice(0, MAX_BYTES).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset);
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
        return parseGps(view, offset + 10);
      }
      if ((marker & 0xff00) !== 0xff00 || size < 2) return null;
      offset += 2 + size;
    }
    return null;
  } catch {
    return null;
  }
}
