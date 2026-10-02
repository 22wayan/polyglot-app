import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Loader2, Mic, Send, Trash2 } from 'lucide-react';
import { LANGUAGES, LANG_ORDER } from '../data';
import { speak, recognizeSpeech, speechRecognitionAvailable } from '../ai';
import { IconButton, WordChip, LockedAI } from './ui';

// ---------- CHAT ----------
export function ChatView({ chats, activeLangs, chatLang, setChatLang, onStart, onSend, onReset, generating, genError, hasApiKey, onMineWord }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chats, chatLang, generating]);

  if (!hasApiKey && !chatLang) return <LockedAI feature="Chat-Tutor" />;

  if (!chatLang) {
    return (
      <div className="flex-1 py-4 scroll-y">
        <h2 className="font-display text-[28px] leading-tight mb-1">Chat-Tutor</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40 mb-6">aktiv sprechen lernen</p>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50 mb-3">Mit welcher Sprache reden?</div>
        <div className="grid grid-cols-2 gap-2">
          {LANG_ORDER.map(l => {
            const L = LANGUAGES[l];
            const active = activeLangs.includes(l);
            const count = chats.filter(m => m.lang === l).length;
            return (
              <button
                key={l}
                onClick={() => active && onStart(l)}
                disabled={!active}
                aria-label={`${L.name} — ${count > 0 ? `${count} Nachrichten` : 'noch nicht gestartet'}`}
                className="rounded-2xl p-3 text-left disabled:opacity-30 min-h-[64px]"
                style={{ background: 'rgba(232,220,196,0.025)', border: `1px solid ${active ? L.accent + '30' : 'rgba(232,220,196,0.08)'}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base" aria-hidden="true">{L.flag}</span>
                  <span className="font-display text-[14px]">{L.name}</span>
                </div>
                <div className="font-mono text-[10px] opacity-50">{count > 0 ? `${count} nachrichten` : 'noch nicht gestartet'}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const L = LANGUAGES[chatLang]; const accent = L.accent;
  const messages = chats.filter(m => m.lang === chatLang).sort((a, b) => a.ts - b.ts);
  const isHan = chatLang === 'zh';
  const busy = generating === 'chat';
  const submit = () => { if (!input.trim() || busy) return; onSend(input.trim()); setInput(''); };

  return (
    <div className="flex-1 flex flex-col min-h-0 py-2">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setChatLang(null)} aria-label="Zurück zur Sprachauswahl" className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 px-2 py-2 min-h-[36px]">← sprachen</button>
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{L.flag}</span>
          <span className="font-display text-[16px]">{L.name}</span>
        </div>
        <IconButton onClick={() => onReset(chatLang)} ariaLabel="Chat zurücksetzen" className="opacity-40 hover:opacity-100">
          <Trash2 size={13} />
        </IconButton>
      </div>
      <div ref={scrollRef} className="flex-1 scroll-y space-y-3 py-2">
        {messages.length === 0 && !busy && <div className="text-center py-12 opacity-50 text-sm">Lade Begrüßung...</div>}
        {messages.map((m) => m.role === 'user' ? (
          <UserMsg key={m.localId ?? m.ts} msg={m} accent={accent} isHan={isHan} />
        ) : (
          <TutorMsg key={m.localId ?? m.ts} msg={m} accent={accent} isHan={isHan} L={L} lang={chatLang} onMineWord={onMineWord} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 px-3 opacity-60">
            <Loader2 size={12} className="animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-wider">tutor tippt...</span>
          </div>
        )}
        {genError && <div role="alert" className="rounded-xl p-2.5 font-mono text-[10px]" style={{ background: '#FF6B6B15', color: '#FF6B6B', border: '1px solid #FF6B6B30' }}>⚠ {genError}</div>}
      </div>
      <div className="flex gap-2 items-center mt-2 p-2 rounded-2xl" style={{ background: 'rgba(232,220,196,0.04)', border: '1px solid rgba(232,220,196,0.1)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={busy ? 'warte auf Tutor...' : `auf ${L.name} schreiben...`}
          aria-label={`Nachricht auf ${L.name}`}
          className="flex-1 px-3 py-2 text-[14px]"
          disabled={busy}
        />
        <ChatMicButton lang={chatLang} accent={accent} onResult={(t) => setInput(prev => (prev + ' ' + t).trim())} />
        <button
          onClick={submit}
          disabled={!input.trim() || busy}
          aria-label="Senden"
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 rounded-xl disabled:opacity-30"
          style={{ background: accent, color: '#0F0E0D' }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

function UserMsg({ msg, accent, isHan }) {
  return (
    <div className="flex justify-end">
      <div className={`max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 ${isHan ? 'font-han' : ''}`} style={{
        background: `${accent}15`, border: `1px solid ${accent}30`, color: '#E8DCC4',
      }}>
        <div className="text-[14px] leading-snug">{msg.target}</div>
      </div>
    </div>
  );
}

function TutorMsg({ msg, accent, isHan, L, lang, onMineWord }) {
  const [showTrans, setShowTrans] = useState(false);
  const correction = msg.correction?.trim?.();
  const correctionExplanation = msg.correctionExplanation?.trim?.();
  const target = msg.target?.trim?.();
  if (!target && !correction) return null; // nothing renderable
  return (
    <div className="flex flex-col items-start gap-1 max-w-[90%]">
      {correction && (
        <div className="rounded-xl px-3 py-2 mb-1 text-[12px] opacity-90" style={{ background: '#FFB84D15', border: '1px solid #FFB84D30', color: '#FFB84D' }}>
          <div className="font-mono text-[9px] uppercase tracking-wider opacity-70 mb-1">Korrektur</div>
          <div className={`text-[13px] mb-1 ${isHan ? 'font-han' : ''}`}>{correction}</div>
          {correctionExplanation && <div className="text-[11px] opacity-80 italic">{correctionExplanation}</div>}
        </div>
      )}
      <div className={`rounded-2xl rounded-tl-md px-4 py-2.5 ${isHan ? 'font-han' : ''}`} style={{ background: 'rgba(232,220,196,0.05)', border: '1px solid rgba(232,220,196,0.1)' }}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="text-[14px] leading-snug" style={{ color: accent }}>{msg.target}</div>
          <button
            onClick={() => speak(msg.target, L.tts)}
            aria-label="Antwort anhören"
            className="inline-flex items-center justify-center min-w-[32px] min-h-[32px] p-1.5 rounded-full shrink-0"
            style={{ background: `${accent}15`, color: accent }}
          >
            <Volume2 size={11} />
          </button>
        </div>
        {msg.pronunciation && <div className="font-mono text-[11px] opacity-70 mb-1">{msg.pronunciation}</div>}
        {showTrans ? (
          <div className="text-[12px] opacity-80 mt-1">↳ {msg.translation}</div>
        ) : (
          <button onClick={() => setShowTrans(true)} className="font-mono text-[9px] uppercase tracking-wider opacity-50 hover:opacity-90 mt-1 min-h-[28px]">↓ Übersetzung</button>
        )}
      </div>
      {msg.newWords && msg.newWords.length > 0 && (
        <div className="flex flex-wrap mt-1">
          {msg.newWords.map((w, i) => (
            <WordChip key={i} word={w} accent={accent} isHan={isHan}
              onMine={() => onMineWord(lang, w.word, w.translation, w.pronunciation)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChatMicButton({ lang, onResult }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const langCode = LANGUAGES[lang].tts;

  useEffect(() => () => { abortRef.current?.abort?.(); }, []);

  if (!speechRecognitionAvailable()) return null;

  const start = async () => {
    setError(null); setRecording(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const t = await recognizeSpeech(langCode, { signal: ctrl.signal });
      onResult(t);
    } catch (e) {
      setError(e.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setRecording(false);
      abortRef.current = null;
    }
  };
  return (
    <button
      onClick={start}
      disabled={recording}
      aria-label={recording ? 'höre zu' : 'sprich nach'}
      title={error || (recording ? 'höre zu' : 'sprich')}
      className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 rounded-xl ${recording ? 'pulse-rec' : ''}`}
      style={{
        background: recording ? '#FF6B6B20' : 'rgba(232,220,196,0.08)',
        color: recording ? '#FF6B6B' : '#E8DCC4',
        border: `1px solid ${recording ? '#FF6B6B40' : 'rgba(232,220,196,0.1)'}`,
      }}
    >
      <Mic size={14} />
    </button>
  );
}
