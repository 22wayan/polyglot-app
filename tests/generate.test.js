// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../api/generate';

let ipCounter = 0;

function mockRes() {
  const res = { statusCode: 0, body: undefined, headers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}

function req({ method = 'POST', origin = 'http://localhost:5173', query = {}, body = {}, headers = {}, ip } = {}) {
  const h = { 'x-real-ip': ip ?? `10.0.0.${++ipCounter}`, ...headers };
  if (origin) h.origin = origin;
  return { method, query, body, headers: h };
}

async function call(r) {
  const res = mockRes();
  await handler(r, res);
  return res;
}

describe('api/generate', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('VITE_APP_TOKEN', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('probe reports a missing key with 503', async () => {
    const res = await call(req({ method: 'GET', query: { probe: '1' } }));
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toBe('NO_API_KEY');
    expect(res.headers['Cache-Control']).toMatch(/no-store/);
  });

  it('probe answers ok when a key is set', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const res = await call(req({ method: 'GET', query: { probe: '1' } }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects foreign origins', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const res = await call(req({ origin: 'https://evil.example', body: { prompt: 'hi' } }));
    expect(res.statusCode).toBe(403);
  });

  it('rejects a wrong app token when one is configured', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubEnv('VITE_APP_TOKEN', 'secret');
    const bad = await call(req({ body: { prompt: 'hi' }, headers: { 'x-app-token': 'nope' } }));
    expect(bad.statusCode).toBe(403);
  });

  it('only allows POST outside the probe', async () => {
    const res = await call(req({ method: 'PUT' }));
    expect(res.statusCode).toBe(405);
  });

  it('validates the prompt', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    expect((await call(req({ body: {} }))).statusCode).toBe(400);
    expect((await call(req({ body: { prompt: 'x'.repeat(8001) } }))).statusCode).toBe(413);
  });

  it('forwards to Anthropic with a capped token budget and an allowed model', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Hola' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(req({ body: { prompt: 'hi', max_tokens: 99999, model: 'gpt-4' } }));

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ text: 'Hola' });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.max_tokens).toBe(3000);
    expect(sent.model).toBe('claude-sonnet-4-6');
  });

  it('limits requests per client IP', async () => {
    const ip = '192.0.2.77';
    const statuses = [];
    for (let i = 0; i < 13; i++) {
      statuses.push((await call(req({ method: 'GET', query: { probe: '1' }, ip }))).statusCode);
    }
    expect(statuses.slice(0, 12).every(s => s === 503)).toBe(true);
    expect(statuses[12]).toBe(429);
  });

  it('uses the last x-forwarded-for entry, so a spoofed first entry does not reset the limit', async () => {
    const statuses = [];
    for (let i = 0; i < 13; i++) {
      const r = req({ method: 'GET', query: { probe: '1' }, headers: { 'x-forwarded-for': `203.0.113.${i}, 198.51.100.9` } });
      delete r.headers['x-real-ip'];
      statuses.push((await call(r)).statusCode);
    }
    expect(statuses[12]).toBe(429);
  });
});
