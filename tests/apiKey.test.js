import { describe, it, expect } from 'vitest';
import { getUserKey, setUserKey, looksLikeAnthropicKey, maskKey } from '../src/apiKey';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

const KEY = 'sk-ant-' + 'a1B2'.repeat(10);

describe('user key storage', () => {
  it('stores, trims and removes the key', () => {
    const s = memoryStorage();
    expect(getUserKey(s)).toBe('');
    setUserKey(`  ${KEY}  `, s);
    expect(getUserKey(s)).toBe(KEY);
    setUserKey('', s);
    expect(getUserKey(s)).toBe('');
  });

  it('survives a missing or broken storage', () => {
    expect(getUserKey(null)).toBe('');
    const broken = { getItem: () => { throw new Error('blocked'); } };
    expect(getUserKey(broken)).toBe('');
  });
});

describe('key checks', () => {
  it('accepts the Anthropic key format only', () => {
    expect(looksLikeAnthropicKey(KEY)).toBe(true);
    expect(looksLikeAnthropicKey('sk-proj-abc')).toBe(false);
    expect(looksLikeAnthropicKey('')).toBe(false);
  });

  it('masks all but the last four characters', () => {
    expect(maskKey(KEY)).toBe(`sk-ant-…${KEY.slice(-4)}`);
    expect(maskKey(KEY)).not.toContain(KEY.slice(7, 20));
  });
});
