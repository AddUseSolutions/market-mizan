const { query } = require("../db/connection");

/**
 * Canonical Just Property id from detail URL last path segment: JP{digits}.
 */
function justPropertyIdFromUrl(detailUrl) {
  try {
    const last = new URL(String(detailUrl || "")).pathname.replace(/\/+$/, "").split("/").pop();
    if (last && /^\d+$/.test(last)) return `JP${last}`;
  } catch {
    /* ignore */
  }
  return null;
}

function digitKeyFromPropertyId(propertyId) {
  const m = String(propertyId || "").match(/(\d{6,})/);
  return m ? m[1] : null;
}

function uniqueImageCount(raw) {
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return 0;
  const keys = new Set();
  for (const u of list) {
    if (typeof u !== "string" || !u.trim()) continue;
    const m = u.match(/([a-f0-9]{32})/i);
    keys.add(m ? m[1].toLowerCase() : u.split("?")[0].toLowerCase());
  }
  return keys.size;
}

function scoreRow(row) {
  const pid = String(row.property_id || "");
  let score = 0;
  if (/^JP\d+$/i.test(pid)) score += 100;
  else if (/^\d+$/.test(pid)) score += 40;
  else if (/^RL/i.test(pid)) score -= 20;
  score += uniqueImageCount(row.images) * 10;
  if (row.owner_id != null) score += 25;
  if (row.bedrooms != null) score += 5;
  if (row.property_size_m2 != null) score += 3;
  return score;
}

/**
 * Deactivate duplicate Just Property rows that share the same listing URL
 * (or same numeric listing id). Keeps the highest-scoring row per group.
 */
async function dedupeJustPropertyListings({ dryRun = false, limit = 5000 } = {}) {
  const [rows] = await query(
    `SELECT id, property_id, detail_url, detail_url_normalized, images, owner_id,
            bedrooms, property_size_m2, source_name, is_active
     FROM properties
     WHERE is_active = TRUE
       AND source_website = 'just.property'
     ORDER BY id ASC
     LIMIT ?`,
    [Math.min(Math.max(Number(limit) || 5000, 1), 20000)]
  );

  const groups = new Map();
  for (const row of rows) {
    const fromUrl =
      justPropertyIdFromUrl(row.detail_url_normalized || row.detail_url) ||
      justPropertyIdFromUrl(row.detail_url);
    const digits = (fromUrl && fromUrl.replace(/^JP/i, "")) || digitKeyFromPropertyId(row.property_id);
    const norm = String(row.detail_url_normalized || "").trim().toLowerCase();
    const key = digits ? `id:${digits}` : norm ? `url:${norm}` : `pid:${row.property_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const duplicateGroups = [...groups.entries()].filter(([, list]) => list.length > 1);
  const deactivated = [];
  const kept = [];

  for (const [key, list] of duplicateGroups) {
    const ranked = [...list].sort((a, b) => scoreRow(b) - scoreRow(a) || a.id - b.id);
    const winner = ranked[0];
    kept.push({ key, property_id: winner.property_id, score: scoreRow(winner) });
    for (const loser of ranked.slice(1)) {
      deactivated.push({
        key,
        property_id: loser.property_id,
        kept_property_id: winner.property_id
      });
      if (!dryRun) {
        await query(
          `UPDATE properties
           SET is_active = FALSE,
               last_seen = NOW()
           WHERE id = ?`,
          [loser.id]
        );
      }
    }

    // Prefer canonical JP{digits} id on the kept row when URL has digits.
    const canonical = justPropertyIdFromUrl(winner.detail_url_normalized || winner.detail_url);
    if (!dryRun && canonical && canonical !== winner.property_id) {
      const [clash] = await query(
        `SELECT id FROM properties WHERE property_id = ? AND id <> ? LIMIT 1`,
        [canonical, winner.id]
      );
      if (!clash.length) {
        await query(`UPDATE properties SET property_id = ? WHERE id = ?`, [canonical, winner.id]);
        kept[kept.length - 1].renamed_to = canonical;
      }
    }
  }

  return {
    scanned: rows.length,
    duplicateGroups: duplicateGroups.length,
    deactivated: deactivated.length,
    deactivatedIds: deactivated.map((d) => d.property_id),
    kept,
    dryRun: Boolean(dryRun)
  };
}

module.exports = {
  dedupeJustPropertyListings,
  justPropertyIdFromUrl,
  scoreRow
};
