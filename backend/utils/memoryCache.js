const stores = new Map();

/**
 * Simple in-process TTL cache (per key namespace).
 */
function getCached(key, ttlMs, loader) {
  const entry = stores.get(key);
  if (entry && Date.now() - entry.at < ttlMs) {
    return Promise.resolve(entry.value);
  }
  return Promise.resolve(loader()).then((value) => {
    stores.set(key, { value, at: Date.now() });
    return value;
  });
}

function invalidateCache(key) {
  if (key) stores.delete(key);
  else stores.clear();
}

module.exports = { getCached, invalidateCache };
