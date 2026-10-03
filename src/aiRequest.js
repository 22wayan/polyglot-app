// Request body for the Anthropic Messages API, shared by the direct browser
// call and the optional server proxy. No browser APIs, so tests can run it.

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const MAX_TOKENS_CAP = 3000;

export function buildMessagesBody({ prompt, max_tokens = 1500, system = null, model, cacheSystem = false }) {
  const body = {
    model,
    max_tokens: Math.min(Math.max(parseInt(max_tokens, 10) || 1500, 1), MAX_TOKENS_CAP),
    messages: [{ role: 'user', content: prompt }],
  };
  if (system) {
    body.system = cacheSystem
      ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
      : system;
  }
  return body;
}

export function textFromResponse(data) {
  return (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
}

export function directHeaders(key) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': ANTHROPIC_VERSION,
    // Required for CORS. The key is the user's own and stays on their device.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}
