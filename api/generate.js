// Vercel Serverless Function — Anthropic API proxy.
// Reads ANTHROPIC_API_KEY from env. If missing, returns 503 so the frontend can show a lock state.

const MAX_PROMPT_CHARS = 8000;
const MAX_SYSTEM_CHARS = 8000;
const MAX_TOKENS_CAP = 3000;

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
]);

// Simple per-IP rate limit (in-memory, per Fluid Compute instance).
// Not bullet-proof across instances, but enough to deflect drive-by abuse.
const RATE_LIMIT = { windowMs: 60_000, max: 12 };
const buckets = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT.windowMs;
  // Lazy cleanup
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

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Probe: cheap GET endpoint that tells the client whether the key is set,
  // without ever hitting Anthropic.
  if (req.method === 'GET' && req.query?.probe) {
    if (!apiKey) return res.status(503).json({ error: 'NO_API_KEY' });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    return res.status(503).json({
      error: 'NO_API_KEY',
      message: 'Set ANTHROPIC_API_KEY in Vercel project env vars and redeploy.'
    });
  }

  const ip = clientIp(req);
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests', message: 'Bitte kurz warten.' });
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
