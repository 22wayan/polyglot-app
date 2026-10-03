import React, { useState, useEffect, useRef } from 'react';
import { Lock, Plus, Mic, Check, AlertCircle } from 'lucide-react';
import { recognizeSpeech, similarity, speechRecognitionAvailable } from '../ai';

// ---------- Pill / TabBtn ----------
export function Pill({ icon, value, label, title }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      title={title}
      style={{ background: 'rgba(232,220,196,0.05)', border: '1px solid rgba(232,220,196,0.08)' }}
    >
      {icon && <span aria-hidden="true" style={{ opacity: 0.7 }}>{icon}</span>}
      <span className="font-mono text-[12px] tabular-nums">{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider opacity-40">{label}</span>
    </div>
  );
}
export function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="flex flex-col items-center gap-1 px-1.5 py-1 min-w-[44px] min-h-[44px] justify-center"
      style={{ color: active ? '#E8DCC4' : 'rgba(232,220,196,0.4)' }}
    >
      {icon}
      <span className="font-mono text-[8px] uppercase tracking-[0.12em]">{label}</span>
    </button>
  );
}

// ---------- IconButton: ensures 44×44 hit area for icon-only buttons ----------
export function IconButton({ onClick, ariaLabel, children, accent, disabled, className = '', style = {}, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 rounded-full disabled:opacity-40 ${className}`}
      style={{
        background: accent ? `${accent}15` : 'rgba(232,220,196,0.05)',
        color: accent || '#E8DCC4',
        border: accent ? `1px solid ${accent}30` : '1px solid rgba(232,220,196,0.1)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ---------- MicButton (with score) ----------
export function MicButton({ target, langCode, accent }) {
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Hooks first: React needs the same hook order on every render.
  useEffect(() => () => { abortRef.current?.abort?.(); }, []);

  // Don't render at all if SR is broken (e.g. iOS-PWA Apple bug)
  if (!speechRecognitionAvailable()) return null;

  const start = async () => {
    setError(null); setResult(null); setRecording(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const transcript = await recognizeSpeech(langCode, { signal: ctrl.signal });
      setResult({ transcript, score: similarity(transcript, target) });
    } catch (e) {
      setError(e.message);
    } finally {
      setRecording(false);
      abortRef.current = null;
    }
  };

  const score = result?.score ?? 0;
  const tone = score > 0.85 ? '#4ADE80' : score > 0.6 ? '#FFB84D' : '#FF6B6B';

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button
          onClick={start}
          disabled={recording}
          aria-label={recording ? 'höre zu' : 'sprich nach'}
          className={`flex items-center gap-2 px-3 py-2 rounded-full min-h-[36px] ${recording ? 'pulse-rec' : ''}`}
          style={{
            background: recording ? '#FF6B6B20' : `${accent}10`,
            color: recording ? '#FF6B6B' : accent,
            border: `1px solid ${recording ? '#FF6B6B40' : accent + '25'}`,
          }}
        >
          <Mic size={13} />
          <span className="font-mono text-[10px] uppercase tracking-wider">{recording ? 'hör zu...' : 'sprich'}</span>
        </button>
        {result && score < 0.6 && (
          <button
            onClick={start}
            disabled={recording}
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full opacity-70 hover:opacity-100"
            style={{ border: '1px solid rgba(232,220,196,0.15)' }}
          >
            nochmal
          </button>
        )}
      </div>
      {error && (
        <div role="alert" className="mt-2 font-mono text-[10px] opacity-70 flex items-start gap-1.5">
          <AlertCircle size={11} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      {result && (
        <div
          className={`mt-2 p-2.5 rounded-xl ${score > 0.85 ? 'score-celebrate' : ''}`}
          style={{ background: `${tone}15`, border: `1px solid ${tone}30` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] uppercase tracking-wider opacity-60">erkannt</span>
            <span className="font-mono text-[11px] tabular-nums" style={{ color: tone }}>
              {Math.round(score * 100)}%
            </span>
          </div>
          <div className="text-[13px]">{result.transcript}</div>
          {score < 0.85 && <div className="font-mono text-[10px] opacity-60 mt-1">Ziel: {target}</div>}
        </div>
      )}
    </div>
  );
}

// ---------- WordChip ----------
export function WordChip({ word, accent, onMine, isHan }) {
  const [mined, setMined] = useState(false);
  // Guard: model occasionally emits empty word/translation entries — skip them
  // instead of rendering an empty pill.
  if (!word?.word?.trim() || !word?.translation?.trim()) return null;
  return (
    <button
      onClick={async () => { if (mined) return; const ok = await onMine(); setMined(ok !== false); }}
      disabled={mined}
      aria-label={`Wort ${word.word} (${word.translation}) ins Deck aufnehmen`}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-left mr-1.5 mb-1.5 group min-h-[32px]"
      style={{
        background: mined ? `${accent}25` : `${accent}08`,
        border: `1px solid ${accent}${mined ? '50' : '20'}`,
        color: mined ? accent : '#E8DCC4',
      }}
    >
      <span className={`font-display text-[13px] ${isHan ? 'font-han' : ''}`}>{word.word}</span>
      <span className="font-mono text-[9px] opacity-60">{word.translation}</span>
      {mined ? <Check size={10} style={{ color: accent }} /> : <Plus size={10} className="opacity-40 group-hover:opacity-100" />}
    </button>
  );
}

// ---------- LockedAI: shown when /api/generate returns 503 ----------
export function LockedAI({ feature }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{
        background: 'rgba(232,220,196,0.05)', border: '1px solid rgba(232,220,196,0.1)',
      }}>
        <Lock size={20} className="opacity-60" />
      </div>
      <div className="font-display text-[22px] leading-tight mb-2">{feature} braucht einen API-Key</div>
      <p className="text-sm opacity-60 max-w-[320px] leading-relaxed mb-4">
        Diese Funktion nutzt Claude von Anthropic. Trag im Setup-Tab deinen eigenen API-Key ein. Er bleibt auf diesem Gerät, die Kosten laufen über dein Anthropic-Konto.
      </p>
    </div>
  );
}

// ---------- Empty state with optional CTAs ----------
export function EmptyState({ title, hint, ctas = [] }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="font-display text-[36px] leading-tight mb-3">{title}</div>
      <p className="text-sm opacity-60 max-w-[280px] leading-relaxed mb-6">{hint}</p>
      {ctas.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {ctas.map((c, i) => (
            <button
              key={i}
              onClick={c.onClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ background: 'rgba(232,220,196,0.05)', border: '1px solid rgba(232,220,196,0.15)' }}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
