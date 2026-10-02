// Parsing and validation of model output. Kept free of browser APIs so the
// unit tests can run it directly.

export function extractJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  // Try direct parse first — fast path when model behaves
  try { return JSON.parse(clean); } catch { /* fall through to the balanced-bracket search */ }
  // Fallback: find first balanced JSON expression
  const tryParseFrom = (start, open, close) => {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < clean.length; i++) {
      const ch = clean[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(clean.slice(start, i + 1)); } catch { return null; }
        }
      }
    }
    return null;
  };
  const arrStart = clean.indexOf('[');
  const objStart = clean.indexOf('{');
  const candidates = [];
  if (arrStart !== -1) candidates.push([arrStart, '[', ']']);
  if (objStart !== -1) candidates.push([objStart, '{', '}']);
  candidates.sort((a, b) => a[0] - b[0]);
  for (const [s, o, c] of candidates) {
    const v = tryParseFrom(s, o, c);
    if (v !== null) return v;
  }
  throw new Error('Kein JSON in der Antwort');
}

// Models occasionally emit empty-string fields ("", "   ") or placeholder
// objects in newWords. Without sanitization these render as empty pills,
// blank correction boxes, or empty chat bubbles. Normalize at the boundary
// so the rest of the app can trust the shape.
export function trimStr(v) { return typeof v === 'string' ? v.trim() : ''; }
export function trimOrNull(v) { const t = trimStr(v); return t || null; }

export function sanitizeChatReply(raw) {
  const reply = trimStr(raw?.reply);
  if (!reply) throw new Error('Tutor-Antwort war leer');
  return {
    reply,
    replyTranslation: trimStr(raw?.replyTranslation),
    pronunciation: trimStr(raw?.pronunciation),
    correction: trimOrNull(raw?.correction),
    correctionExplanation: trimOrNull(raw?.correctionExplanation),
    newWords: Array.isArray(raw?.newWords)
      ? raw.newWords
          .map(w => ({
            word: trimStr(w?.word),
            translation: trimStr(w?.translation),
            pronunciation: trimStr(w?.pronunciation),
          }))
          .filter(w => w.word && w.translation)
      : [],
  };
}
