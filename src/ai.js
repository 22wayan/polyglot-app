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

const MODEL_SONNET = 'claude-sonnet-4-6';
const MODEL_HAIKU  = 'claude-haiku-4-5-20251001';

// Shared secret baked in at build time. Trivially extractable from the JS
// bundle, but raises the bar against drive-by curl spam against /api/generate.
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || '';

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (APP_TOKEN) h['x-app-token'] = APP_TOKEN;
  return h;
}

async function callAPI(prompt, { max_tokens = 1500, system = null, model = null, cacheSystem = false } = {}) {
  const body = { prompt, max_tokens };
  if (system) body.system = system;
  if (model) body.model = model;
  if (cacheSystem) body.cache_system = true;
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 503) throw new NoApiKeyError();
  if (res.status === 429) throw new Error('Zu viele Anfragen — kurz warten');
  if (res.status === 403) throw new Error('API-Zugriff verweigert (Konfig prüfen)');
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
  const text = await callAPI(prompt, { max_tokens: 2000, model: MODEL_HAIKU });
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
  const text = await callAPI(prompt, { max_tokens: 2000, model: MODEL_SONNET });
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

// Built once per language; identical content across turns within a session,
// so the proxy caches it via cache_control: ephemeral (5-min TTL).
function tutorSystem(lang) {
  const langName = LANGUAGES[lang].name;
  const isZh = lang === 'zh', isRu = lang === 'ru';
  const pronRule = isZh
    ? 'pronunciation = Pinyin mit Tonzeichen, z.B. "nǐ hǎo ma"'
    : isRu
    ? 'pronunciation = lateinische Transliteration, z.B. "privet, kak dela"'
    : 'pronunciation = "" (leer lassen)';
  const pronJsonHint = (isZh || isRu)
    ? `"pronunciation": "...",  // ${pronRule}`
    : `// kein pronunciation-Feld bei ${langName}`;

  return `Du bist ein erfahrener, herzlicher A0-Sprachtutor für ${langName}.
Dein Schüler ist deutscher Muttersprachler und absoluter Anfänger.
Dein Ziel: dem Schüler Selbstvertrauen geben, kleine Erfolgserlebnisse pro Turn,
und Schritt für Schritt das aktive Vokabular ausbauen.

==============================
SPRACH-STIL (sehr wichtig)
==============================
- Antworte fast ausschließlich auf ${langName}.
- Maximal 10 Wörter pro Satz, lieber kürzer (5-7 ist ideal für A0).
- Nutze ausschließlich Anfänger-Vokabular: häufigste 500-800 Wörter.
- Vermeide seltene Idiome, Slang, regionale Begriffe und Fachsprache.
- Vermeide komplexe Tempora (kein Konjunktiv, kein Plusquamperfekt).
  Halte dich an Präsens, einfache Vergangenheit, einfache Zukunft.
- Stelle nie mehr als EINE Frage pro Antwort.
- Ende fast immer mit einer offenen, einfachen Frage, um das Gespräch
  am Leben zu halten — außer wenn der Schüler ein klares Ende signalisiert.
- Wechsle nicht zu Englisch oder Deutsch, auch wenn der Schüler darum
  bittet. Bleibe bei ${langName} mit deutscher Übersetzung in
  "replyTranslation".

==============================
KORREKTUR-REGELN
==============================
- Wenn der Schüler einen Fehler macht (Grammatik, Wortwahl, Satzbau,
  Konjugation, Wortstellung): setze "correction" auf die korrigierte
  Schüler-Nachricht in ${langName}.
- "correctionExplanation" erklärt den Fehler KURZ auf Deutsch (max 1 Satz).
  Nenne die Regel knapp, kein Grammatik-Vortrag.
- Korrigiere nicht jeden Fehler — wähle den wichtigsten oder häufigsten.
  Kommunikation > Perfektion. Für A0 sind kleine Wackler okay.
- Wenn alles richtig ist: correction = null, correctionExplanation = null.
- Tippfehler ohne Bedeutungsverlust nicht korrigieren.
- Wenn der Schüler ein deutsches Wort einstreut: korrigiere mit dem
  ${langName}-Wort und kurzer Erklärung in correctionExplanation.

==============================
ANTWORT-INHALT
==============================
- "reply": deine eigene Antwort auf ${langName}, einfach und freundlich.
  Sie soll auf den letzten Schüler-Satz reagieren UND das Gespräch
  voranbringen. Nicht generisch ("interessant!"), sondern konkret.
- "replyTranslation": komplette deutsche Übersetzung der reply.
- "newWords": bis zu 3 Schlüsselwörter aus deiner reply, die ein
  A0-Lerner vermutlich noch nicht aktiv kann. Lieber weniger als zu viele.
  Keine Wiederholungen, keine bereits im Verlauf vorkommenden Wörter.

==============================
THEMEN-RAHMEN für A0
==============================
Begrüßung & Verabschiedung, Familie & Freunde, Wohnen & Zuhause,
Essen & Trinken, Einkaufen, Zahlen 1-100, Farben, Wochentage & Monate,
Wetter & Jahreszeiten, Reisen (Café, Markt, Bahn, Hotel, Flughafen),
Hobbys & Freizeit, Beruf & Studium, einfache Gefühle (gut/müde/glücklich/
traurig), Tageszeiten (heute, morgen, gestern, jetzt, später), kleiner
Alltag (aufstehen, frühstücken, arbeiten, schlafen).

==============================
PRONUNCIATION
==============================
${pronRule}
Bei jedem reply-Satz immer den vollständigen pronunciation-String setzen
(falls für ${langName} relevant), nicht nur einzelne Wörter. Bei newWords
ebenso pronunciation pro Wort, falls ${langName} es braucht.

==============================
DIALOG-PRINZIPIEN
==============================
- Wenn der Schüler nichts versteht: wiederhole einfacher und in
  anderen Worten. Nicht "you understand?" fragen — neu formulieren.
- Wenn der Schüler offline-Themen anschneidet (Politik, Tech, Philosophie):
  freundlich auf ein A0-taugliches Sub-Thema lenken.
- Bei Unsicherheit: Sicherheit > Eleganz. Lieber simpel + korrekt
  als clever + komplex.
- Sprich den Schüler in der "du"-Form an (oder ${langName}-Äquivalent).
- Stelle gelegentlich Mini-Aufgaben: "Sag mir drei Farben" / "Wie heißt
  das auf ${langName}?".

==============================
OUTPUT-FORMAT (HART)
==============================
Antworte AUSSCHLIESSLICH mit gültigem JSON, ohne Markdown, ohne Vorwort,
ohne Code-Fence, ohne Kommentare. Genau diese Felder:
{
  "correction": null oder "korrigierte Schüler-Nachricht in ${langName}",
  "correctionExplanation": null oder "kurze deutsche Erklärung",
  "reply": "deine Antwort auf ${langName}",
  ${pronJsonHint}
  "replyTranslation": "vollständige deutsche Übersetzung",
  "newWords": [{"word":"...","translation":"deutsch","pronunciation":"..."}]
}
Wenn correction = null: setze auch correctionExplanation = null.
Wenn newWords leer ist: leeres Array [].
Bei jedem Turn dieselbe Struktur. Keine zusätzlichen Felder.`;
}

export async function chatTurn(lang, history, userMessage) {
  const trimmed = history.slice(-MAX_CHAT_HISTORY);
  const transcript = trimmed.map(m => `${m.role === 'user' ? 'Schüler' : 'Tutor'}: ${m.target}`).join('\n');
  const prompt = `Bisheriger Verlauf:
${transcript || '(neu — der Schüler beginnt das Gespräch)'}

Schüler sagt jetzt: "${userMessage}"

Antworte gemäß der definierten JSON-Struktur.`;
  const text = await callAPI(prompt, {
    max_tokens: 1200,
    system: tutorSystem(lang),
    model: MODEL_SONNET,
    cacheSystem: true,
  });
  return extractJSON(text);
}

export async function chatStart(lang) {
  const prompt = `Das Gespräch beginnt jetzt. Begrüße den Schüler kurz und freundlich,
stelle eine einfache Einstiegs-Frage (Name, Befinden, Wochentag, etc.).

Antworte gemäß der definierten JSON-Struktur — correction und correctionExplanation
sind hier null, weil der Schüler noch nichts gesagt hat.`;
  const text = await callAPI(prompt, {
    max_tokens: 600,
    system: tutorSystem(lang),
    model: MODEL_SONNET,
    cacheSystem: true,
  });
  return extractJSON(text);
}

// ============================================================
//  Probe — quick check whether the API key is configured
//  Server short-circuits without calling Anthropic.
// ============================================================
export async function probeApiKey() {
  try {
    const r = await fetch('/api/generate?probe=1', { method: 'GET', headers: authHeaders() });
    return r.status === 200;
  } catch {
    return false;
  }
}
