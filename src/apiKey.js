// The user's own Anthropic key. It lives only in this browser's localStorage
// and is sent to api.anthropic.com, never to a server of this app.

const STORAGE_KEY = 'polyglot.anthropicKey';
const KEY_PATTERN = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function getUserKey(storage = defaultStorage()) {
  try { return storage?.getItem(STORAGE_KEY)?.trim() || ''; } catch { return ''; }
}

export function setUserKey(key, storage = defaultStorage()) {
  const value = String(key ?? '').trim();
  if (!storage) return;
  if (value) storage.setItem(STORAGE_KEY, value);
  else storage.removeItem(STORAGE_KEY);
}

export function looksLikeAnthropicKey(key) {
  return KEY_PATTERN.test(String(key ?? '').trim());
}

// Shows only the end of the key, so a screenshot of the setup tab leaks nothing usable.
export function maskKey(key) {
  const value = String(key ?? '').trim();
  return value.length > 12 ? `sk-ant-…${value.slice(-4)}` : '';
}
