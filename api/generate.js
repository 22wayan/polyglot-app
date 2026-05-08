// Vercel Serverless Function — Anthropic API proxy.
// Reads ANTHROPIC_API_KEY from env. If missing, returns 503 so the frontend can show a lock state.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'NO_API_KEY',
      message: 'Set ANTHROPIC_API_KEY in Vercel project env vars and redeploy.'
    });
  }

  try {
    const { prompt, max_tokens = 1500, system = null } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      messages: [{ role: 'user', content: prompt }],
    };
    if (system) body.system = system;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
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
