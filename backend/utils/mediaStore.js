/**
 * Listing photo storage in the database (media_files table).
 * Each upload keeps the untouched original plus two web variants:
 *   lg — gallery, up to 3200 px long edge, JPEG q90 (4:4:4)
 *   sm — cards/thumbnails, up to 960 px, JPEG q80
 * Public URLs: <API>/api/media/<key> (lg) and <API>/api/media/<key>/sm.
 */
const crypto = require("crypto");
const { query, dialect } = require("../db/connection");

let sharp = null;
try {
  sharp = require("sharp");
  // Phone photos decode to ~150 MB of pixels; keep memory flat on small instances.
  sharp.cache(false);
  sharp.concurrency(1);
} catch {
  sharp = null;
}

const MEDIA_KEY_RE = /^[a-f0-9]{32}$/;
const PUBLIC_VARIANTS = ["lg", "sm"];
const VARIANT_SPECS = {
  lg: { maxDim: 3200, quality: 90, chromaSubsampling: "4:4:4" },
  sm: { maxDim: 960, quality: 80, chromaSubsampling: "4:2:0" }
};
const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is;

async function ensureMediaSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS media_files (
        id SERIAL PRIMARY KEY,
        media_key VARCHAR(40) NOT NULL,
        variant VARCHAR(10) NOT NULL,
        mime VARCHAR(60) NOT NULL,
        width INT,
        height INT,
        byte_size INT NOT NULL,
        data BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (media_key, variant)
      )
    `);
    return;
  }
  await query(`
    CREATE TABLE IF NOT EXISTS media_files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      media_key VARCHAR(40) NOT NULL,
      variant VARCHAR(10) NOT NULL,
      mime VARCHAR(60) NOT NULL,
      width INT NULL,
      height INT NULL,
      byte_size INT NOT NULL,
      data LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_media_variant (media_key, variant)
    )
  `);
}

function publicApiBase() {
  const raw =
    process.env.PUBLIC_API_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 3001}`;
  return String(raw).replace(/\/+$/, "");
}

function mediaUrl(key, variant = "lg") {
  const base = `${publicApiBase()}/api/media/${key}`;
  return variant === "lg" ? base : `${base}/${variant}`;
}

function isMediaKey(value) {
  return MEDIA_KEY_RE.test(String(value || ""));
}

async function insertVariant(key, variant, { mime, width, height, data }) {
  await query(
    `INSERT INTO media_files (media_key, variant, mime, width, height, byte_size, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [key, variant, mime, width || null, height || null, data.length, data]
  );
}

async function renderVariant(buffer, spec) {
  const { data, info } = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: spec.maxDim, height: spec.maxDim, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: spec.quality, mozjpeg: true, chromaSubsampling: spec.chromaSubsampling })
    .toBuffer({ resolveWithObject: true });
  return { mime: "image/jpeg", width: info.width, height: info.height, data };
}

/**
 * Store one image buffer; returns the public lg URL.
 * Throws when the buffer is not a decodable image.
 */
async function storeImage(buffer, mime = "image/jpeg") {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("Empty image upload.");
  const key = crypto.randomBytes(16).toString("hex");

  if (!sharp) {
    await insertVariant(key, "lg", { mime, data: buffer });
    return mediaUrl(key, "lg");
  }

  const meta = await sharp(buffer, { failOn: "none" }).metadata();
  if (!meta.width || !meta.height) throw new Error("Unsupported image file.");

  await insertVariant(key, "orig", { mime, width: meta.width, height: meta.height, data: buffer });
  for (const variant of PUBLIC_VARIANTS) {
    await insertVariant(key, variant, await renderVariant(buffer, VARIANT_SPECS[variant]));
  }
  return mediaUrl(key, "lg");
}

async function storeUploadedFiles(files) {
  const urls = [];
  for (const file of files || []) {
    urls.push(await storeImage(file.buffer, file.mimetype || "image/jpeg"));
  }
  return urls;
}

/** Replace inline base64 data URLs with stored media URLs; other entries pass through. */
async function persistInlineImages(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list) {
    const match = typeof entry === "string" ? entry.match(DATA_URL_RE) : null;
    if (!match) {
      out.push(entry);
      continue;
    }
    try {
      out.push(await storeImage(Buffer.from(match[2], "base64"), match[1].toLowerCase()));
    } catch (err) {
      console.warn("media: dropped undecodable inline image:", err.message);
    }
  }
  return out;
}

async function getMediaVariant(key, variant) {
  const [rows] = await query(
    `SELECT mime, data FROM media_files WHERE media_key = ? AND variant = ? LIMIT 1`,
    [key, variant]
  );
  return rows[0] || null;
}

function parseJsonList(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** One-off boot migration: move base64 images out of listing JSON columns. */
async function migrateInlineImages() {
  const likeSql =
    dialect === "postgres" ? `images::text LIKE '%data:image/%'` : `images LIKE '%data:image/%'`;
  const castSql = dialect === "postgres" ? "CAST(? AS jsonb)" : "?";
  let moved = 0;
  for (const table of ["listing_submissions", "properties"]) {
    const [ids] = await query(`SELECT id FROM ${table} WHERE ${likeSql}`);
    for (const { id } of ids) {
      const [rows] = await query(`SELECT images FROM ${table} WHERE id = ? LIMIT 1`, [id]);
      const images = await persistInlineImages(parseJsonList(rows[0]?.images));
      await query(`UPDATE ${table} SET images = ${castSql} WHERE id = ?`, [JSON.stringify(images), id]);
      moved += 1;
    }
  }
  if (moved) console.log(`media: moved inline images for ${moved} rows into media_files.`);
}

module.exports = {
  ensureMediaSchema,
  storeImage,
  storeUploadedFiles,
  persistInlineImages,
  getMediaVariant,
  migrateInlineImages,
  mediaUrl,
  isMediaKey,
  PUBLIC_VARIANTS
};
