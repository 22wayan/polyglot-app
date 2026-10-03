import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildMessagesBody, MAX_TOKENS_CAP } from '../src/aiRequest';
import * as ai from '../src/ai';
import { setUserKey } from '../src/apiKey';

const KEY = 'sk-ant-' + 'a1B2'.repeat(10);

function stubStorage() {
  const data = new Map();
  const storage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
  vi.stubGlobal('localStorage', storage);
  return storage;
}

afterEach(() => vi.unstubAllGlobals());

describe('buildMessagesBody', () => {
  it('caps tokens and marks a cached system prompt', () => {
    const body = buildMessagesBody({ prompt: 'hi', max_tokens: 99999, system: 'tutor', model: 'm', cacheSystem: true });
    expect(body.max_tokens).toBe(MAX_TOKENS_CAP);
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });
});

describe('own key in the browser', () => {
  it('calls Anthropic directly and never the app server', async () => {
    setUserKey(KEY, stubStorage());
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: '{"reply":"Bonjour !","replyTranslation":"Hallo!"}' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const reply = await ai.chatStart('fr');

    expect(reply.reply).toBe('Bonjour !');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe(KEY);
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(fetchMock.mock.calls.every(([u]) => !String(u).includes('/api/generate'))).toBe(true);
  });

  it('reports a rejected key in plain words', async () => {
    setUserKey(KEY, stubStorage());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' }));
    await expect(ai.chatStart('fr')).rejects.toThrow('API-Key ungültig');
  });

  it('counts as configured without asking the server', async () => {
    setUserKey(KEY, stubStorage());
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await ai.probeApiKey()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to the server proxy without an own key', async () => {
    stubStorage();
    const fetchMock = vi.fn().mockResolvedValue({ status: 404, ok: false });
    vi.stubGlobal('fetch', fetchMock);
    await expect(ai.chatStart('fr')).rejects.toBeInstanceOf(ai.NoApiKeyError);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/generate');
  });
});

describe('verifyUserKey', () => {
  it('accepts a key the models endpoint accepts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    expect(await ai.verifyUserKey(KEY)).toEqual({ ok: true });
  });

  it('explains a rejected key and a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    expect((await ai.verifyUserKey(KEY)).ok).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    expect(await ai.verifyUserKey(KEY)).toEqual({ ok: false, reason: 'Keine Verbindung zu Anthropic.' });
  });
});
