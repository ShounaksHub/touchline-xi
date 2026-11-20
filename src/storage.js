const PREFIX = 'touchline-xi:';
const VERSION = 2;

function readRaw(key, fallback) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`) ?? localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed?.version === VERSION && Object.hasOwn(parsed, 'data')) return parsed.data;
    return parsed?.data ?? parsed;
  } catch { return fallback; }
}

export function readStore(key, fallback = null) { return readRaw(key, fallback); }

export function writeStore(key, data) {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify({ version: VERSION, data }));
    return true;
  } catch { return false; }
}

export function removeStore(key) {
  try { localStorage.removeItem(`${PREFIX}${key}`); localStorage.removeItem(key); } catch {}
}
