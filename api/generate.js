// Vercel Serverless Function — Anthropic API proxy.
// Reads ANTHROPIC_API_KEY from env. If missing, returns 503 so the frontend
// can show a lock state. Optional VITE_APP_TOKEN gates the endpoint with a
// shared secret built into the client bundle (filters drive-by abuse).

const MAX_PROMPT_CHARS = 8000;
const MAX_SYSTEM_CHARS = 8000;
const MAX_TOKENS_CAP = 3000;

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
]);

const RATE_LIMIT = { windowMs: 60_000, max: 12 };
const buckets = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT.windowMs;
  if (buckets.size > 1000) {
    for (const [k, arr] of buckets) {
      const trimmed = arr.filter(t => t > cutoff);
      if (trimmed.length === 0) buckets.delete(k);
      else buckets.set(k, trimmed);
    }
  }
  const arr = (buckets.get(ip) || []).filter(t => t > cutoff);
  if (arr.length >= RATE_LIMIT.max) {
    buckets.set(ip, arr);
    return false;
  }
  arr.push(now);
  buckets.set(ip, arr);
  return true;
}

// On Vercel, x-real-ip is set by the edge to the actual client IP.
// x-forwarded-for is appended-to as the request travels — the *last* entry
// is what Vercel saw, the first entries are attacker-controlled. Reading the
// first entry (as we did before) lets anyone bypass the per-IP rate limit
// by sending a fresh fake IP each request.
function clientIp(req) {
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.length) return real.trim();
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) {
    const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.socket?.remoteAddress || 'unknown';
}

// Origin allowlist: any *.vercel.app deploy of this app, plus localhost dev.
// Combined with the shared token, an attacker has to: (1) discover the URL,
// (2) extract the token from the JS bundle, (3) spoof Origin. Each step adds
// friction without breaking preview deploys.
function originAllowed(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const host = u.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.endsWith('.vercel.app')) return true;
    return false;
  } catch {
    return false;
  }
}

function tokenAllowed(req) {
  const expected = process.env.VITE_APP_TOKEN;
  if (!expected) return true; // Token gating is optional — skip if not configured.
  const got = req.headers['x-app-token'];
  return typeof got === 'string' && got === expected;
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

export default async function handler(req, res) {
  noStore(res);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const ip = clientIp(req);

  // Rate-limit FIRST — applies to probe and POST equally so the endpoint
  // can't be spammed even when no key is set.
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests', message: 'Bitte kurz warten.' });
  }

  // Probe: GET ?probe=1. Short-circuits without hitting Anthropic. Still
  // requires origin + token so it can't be used to enumerate.
  if (req.method === 'GET' && req.query?.probe) {
    if (!originAllowed(req)) return res.status(403).json({ error: 'Forbidden' });
    if (!tokenAllowed(req)) return res.status(403).json({ error: 'Forbidden' });
    if (!apiKey) return res.status(503).json({ error: 'NO_API_KEY' });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!originAllowed(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!tokenAllowed(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!apiKey) {
    return res.status(503).json({
      error: 'NO_API_KEY',
      message: 'Set ANTHROPIC_API_KEY in Vercel project env vars and redeploy.'
    });
  }

  try {
    const body = req.body || {};
    let { prompt, max_tokens = 1500, system = null, model, cache_system = false } = body;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return res.status(413).json({ error: 'Prompt too long', limit: MAX_PROMPT_CHARS });
    }
    if (system != null) {
      if (typeof system !== 'string') return res.status(400).json({ error: 'Invalid system' });
      if (system.length > MAX_SYSTEM_CHARS) return res.status(413).json({ error: 'System too long', limit: MAX_SYSTEM_CHARS });
    }
    max_tokens = Math.min(Math.max(parseInt(max_tokens, 10) || 1500, 1), MAX_TOKENS_CAP);
    const useModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    const upstreamBody = {
      model: useModel,
      max_tokens,
      messages: [{ role: 'user', content: prompt }],
    };
    if (system) {
      upstreamBody.system = cache_system
        ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
        : system;
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: 'Anthropic API error', detail: errText.slice(0, 300) });
    }

    const data = await upstream.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', message: String(e?.message || e) });
  }
}
