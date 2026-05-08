import { LANGUAGES, MAX_CHAT_HISTORY } from './data';

// ============================================================
//  Custom error type so the UI can show a nice "lock" state
// ============================================================
export class NoApiKeyError extends Error {
  constructor() { super('Anthropic-API-Key fehlt'); this.code = 'NO_API_KEY'; }
}

// ============================================================
//  Platform detection — iOS-PWA breaks Web Speech API (Apple bug)
// ============================================================

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalonePWA() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function speechRecognitionAvailable() {
  if (typeof window === 'undefined') return false;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  // Apple bug: Web Speech API silently dies in installed PWAs on iOS
  if (isIOS() && isStandalonePWA()) return false;
  return true;
}

// ============================================================
//  TTS — voices populate async on iOS Safari, prime them once
// ============================================================

let _voicesPrimed = false;
function primeVoices() {
  if (_voicesPrimed || typeof window === 'undefined' || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.getVoices(); // triggers async populate
  synth.addEventListener?.('voiceschanged', () => { _voicesPrimed = true; }, { once: true });
  _voicesPrimed = true;
}
if (typeof window !== 'undefined' && window.speechSynthesis) primeVoices();

function pickVoice(langCode) {
  const synth = window.speechSynthesis;
  const all = synth.getVoices() || [];
  if (!all.length) return null;
  const exact = all.find(v => v.lang === langCode);
  if (exact) return exact;
  const prefix = langCode.split('-')[0];
  const partial = all.find(v => v.lang.startsWith(prefix));
  return partial || null;
}

export function speak(text, langCode, rate = 0.85) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (!text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode;
  u.rate = rate;
  const v = pickVoice(langCode);
  if (v) u.voice = v;
  synth.speak(u);
}

// ============================================================
//  Levenshtein + similarity for pronunciation scoring
// ============================================================

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n; if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function normalizeForCompare(s) {
  let n = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  n = n.replace(/[¿?¡!.,;:。，！？、]/g, '').trim();
  return n;
}

export function similarity(spoken, target) {
  const a = normalizeForCompare(spoken);
  const b = normalizeForCompare(target);
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

// ============================================================
//  Speech recognition with timeout + clean teardown
// ============================================================

const SR_TIMEOUT_MS = 8000;

function mapSrError(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Mikrofon-Zugriff verweigert — in den Einstellungen erlauben';
  if (code === 'no-speech') return 'Nichts gehört — sprich lauter oder näher ans Mic';
  if (code === 'audio-capture') return 'Kein Mikrofon gefunden';
  if (code === 'network') return 'Netzwerk-Fehler bei der Spracherkennung';
  if (code === 'aborted') return 'Spracherkennung abgebrochen';
  return code || 'Mikrofon-Fehler';
}

export function recognizeSpeech(langCode, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (!speechRecognitionAvailable()) {
      return reject(new Error(
        isIOS() && isStandalonePWA()
          ? 'Spracherkennung in installierter App nicht verfügbar — im Browser-Tab nutzen'
          : 'Spracherkennung nicht verfügbar (Chrome auf Desktop, Safari im Tab)'
      ));
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = langCode;
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;

    let done = false;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      r.onresult = null; r.onerror = null; r.onend = null;
      if (signal) signal.removeEventListener?.('abort', onAbort);
    };
    const finish = (fn, val) => {
      if (done) return;
      done = true;
      cleanup();
      fn(val);
    };
    const onAbort = () => {
      try { r.abort(); } catch {}
      finish(reject, new Error('Abgebrochen'));
    };

    r.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (t) finish(resolve, t);
      else finish(reject, new Error('Nichts erkannt'));
    };
    r.onerror = (e) => finish(reject, new Error(mapSrError(e.error)));
    r.onend = () => finish(reject, new Error('Nichts gehört — sprich lauter'));

    timeoutId = setTimeout(() => {
      try { r.stop(); } catch {}
      try { r.abort(); } catch {}
      finish(reject, new Error('Spracherkennung antwortet nicht — versuch\'s nochmal'));
    }, SR_TIMEOUT_MS);

    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      r.start();
    } catch (err) {
      finish(reject, new Error(err?.message || 'Mikrofon konnte nicht starten'));
    }
  });
}

// ============================================================
//  AI calls — go through /api/generate proxy on Vercel.
//  When ANTHROPIC_API_KEY is missing, the proxy returns 503
//  and we throw NoApiKeyError so the UI can show a lock state.
// ============================================================

async function callAPI(prompt, max_tokens = 1500, system = null) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, max_tokens, system }),
  });
  if (res.status === 503) throw new NoApiKeyError();
  if (res.status === 429) throw new Error('Zu viele Anfragen — kurz warten');
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${errText.slice(0, 100)}`);
  }
  const data = await res.json();
  return data.text || '';
}

function extractJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  // Try direct parse first — fast path when model behaves
  try { return JSON.parse(clean); } catch {}
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

export async function generateCards(lang, existingPrompts) {
  const langName = LANGUAGES[lang].name;
  const isZh = lang === 'zh', isRu = lang === 'ru';
  const pronRule = isZh ? 'pronunciation = Pinyin mit Tonzeichen' : isRu ? 'pronunciation = lateinische Transliteration' : 'pronunciation = ""';
  const prompt = `Erstelle 8 NEUE A0-Anfänger-Lernkarten Deutsch → ${langName}.
Themen: Alltag, Reisen, Essen, Einkaufen, Familie, Wochentage, Farben, Gefühle, Zeit, Zahlen 4-10.
Vermeide: ${existingPrompts.slice(0, 50).join(' / ')}
NUR JSON, kein Markdown:
[{"de":"...","target":"...","pronunciation":"...","type":"vocab|phrase|sentence","grammar":"..."}]
Regeln: ${pronRule}. grammar = 1 kurzer deutscher Satz mit Struktur/Tipp, oder "". Mische die Typen.`;
  const text = await callAPI(prompt, 2000);
  const arr = extractJSON(text);
  const baseOrder = 1000 + Date.now() % 100000;
  return arr.map((c, i) => ({
    id: `gen_${lang}_${Date.now()}_${i}`, kind: 'vocab', lang,
    type: ['vocab', 'phrase', 'sentence'].includes(c.type) ? c.type : 'vocab',
    de: String(c.de || ''), target: String(c.target || ''),
    pronunciation: String(c.pronunciation || ''), grammar: String(c.grammar || ''),
    order: baseOrder + i,
    stability: 0, difficulty: 0, state: 'new', reps: 0, lapses: 0, due: 0, lastReview: null,
    stats: { again: 0, hard: 0, good: 0, easy: 0 },
  })).filter(c => c.de && c.target);
}

export async function generateStory(lang, existingTitles = []) {
  const langName = LANGUAGES[lang].name;
  const isZh = lang === 'zh', isRu = lang === 'ru';
  const pronField = (isZh || isRu) ? '"pronunciation": "...",' : '';
  const pronRule = isZh ? 'pronunciation = Pinyin mit Tonzeichen' : isRu ? 'pronunciation = Transliteration' : 'pronunciation weglassen';
  const prompt = `Schreibe eine sehr einfache A0-Geschichte auf ${langName} (4-5 kurze Sätze, max 8 Wörter pro Satz).
Themen: Alltagsszene (Café, Markt, Bahn, Familie, Reise, Klassenzimmer, Park).
Vermeide diese Titel: ${existingTitles.join(', ') || '—'}

NUR JSON, kein Markdown:
{
  "title": "deutscher Titel",
  "theme": "Tag (1-2 Wörter)",
  "sentences": [
    {"target":"Satz auf ${langName}",${pronField}"translation":"deutsche Übersetzung","newWords":[{"word":"...","translation":"...","pronunciation":"..."}]}
  ]
}
${pronRule}. newWords: max 3 Schlüsselwörter pro Satz, ohne Wiederholung.`;
  const text = await callAPI(prompt, 2000);
  const obj = extractJSON(text);
  return {
    id: `story_${lang}_${Date.now()}`, lang,
    title: String(obj.title || 'Geschichte'),
    theme: String(obj.theme || ''),
    sentences: (obj.sentences || []).map(s => ({
      target: String(s.target || ''),
      pronunciation: String(s.pronunciation || ''),
      translation: String(s.translation || ''),
      newWords: (s.newWords || []).map(w => ({
        word: String(w.word || ''), translation: String(w.translation || ''), pronunciation: String(w.pronunciation || ''),
      })).filter(w => w.word && w.translation),
    })).filter(s => s.target),
    completed: false, createdAt: Date.now(),
  };
}

export async function chatTurn(lang, history, userMessage) {
  const langName = LANGUAGES[lang].name;
  const isZh = lang === 'zh', isRu = lang === 'ru';
  const pronField = (isZh || isRu) ? '"pronunciation": "...",' : '';
  const pronRule = isZh ? 'pronunciation = Pinyin der "reply"' : isRu ? 'pronunciation = Transliteration der "reply"' : 'pronunciation = ""';
  const trimmed = history.slice(-MAX_CHAT_HISTORY);
  const transcript = trimmed.map(m => `${m.role === 'user' ? 'Schüler' : 'Tutor'}: ${m.target}`).join('\n');
  const system = `Du bist ein geduldiger A0-Sprachtutor für ${langName}.
- Antworte FAST AUSSCHLIESSLICH auf ${langName} mit SEHR EINFACHEN Sätzen (max 10 Wörter)
- Korrigiere Schülerfehler freundlich aber direkt
- Stelle einfache Fragen, halte Konversation am Laufen
- Nutze nur Anfänger-Vokabular`;
  const prompt = `Bisheriger Verlauf:
${transcript || '(neu)'}

Schüler sagt jetzt: "${userMessage}"

Antworte NUR mit JSON, kein Markdown:
{
  "correction": null oder "korrigierte Schüler-Nachricht",
  "correctionExplanation": null oder "kurze deutsche Erklärung",
  "reply": "Antwort auf ${langName}",
  ${pronField}
  "replyTranslation": "deutsche Übersetzung",
  "newWords": [{"word":"...","translation":"...","pronunciation":"..."}]
}
${pronRule}. newWords: bis zu 3 Wörter aus reply die der Schüler vermutlich noch nicht kennt.`;
  const text = await callAPI(prompt, 1200, system);
  return extractJSON(text);
}

export async function chatStart(lang) {
  const langName = LANGUAGES[lang].name;
  const isZh = lang === 'zh', isRu = lang === 'ru';
  const pronField = (isZh || isRu) ? '"pronunciation": "...",' : '';
  const prompt = `Beginne ein freundliches A0-Anfänger-Gespräch auf ${langName}. Begrüße kurz (max 8 Wörter), stelle eine sehr einfache Frage.
NUR JSON: {"reply":"...",${pronField}"replyTranslation":"...","newWords":[]}`;
  const text = await callAPI(prompt, 500);
  return extractJSON(text);
}

// ============================================================
//  Probe — quick check whether the API key is configured
//  Server short-circuits without calling Anthropic.
// ============================================================
export async function probeApiKey() {
  try {
    const r = await fetch('/api/generate?probe=1', { method: 'GET' });
    return r.status === 200;
  } catch {
    return false;
  }
}
