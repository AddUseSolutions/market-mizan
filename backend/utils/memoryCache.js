const stores = new Map();
const inflight = new Map();

/**
 * Simple in-process TTL cache (per key namespace).
 * Concurrent misses for the same key share one loader call.
 */
function getCached(key, ttlMs, loader) {
  const entry = stores.get(key);
  if (entry && Date.now() - entry.at < ttlMs) {
    return Promise.resolve(entry.value);
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const next = Promise.resolve()
    .then(loader)
    .then((value) => {
      stores.set(key, { value, at: Date.now() });
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });
  inflight.set(key, next);
  return next;
}

function invalidateCache(key) {
  if (key) {
    stores.delete(key);
    inflight.delete(key);
  } else {
    stores.clear();
    inflight.clear();
  }
}

module.exports = { getCached, invalidateCache };
