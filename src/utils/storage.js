export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or restricted — ignore
  }
}

export function removeStore(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
