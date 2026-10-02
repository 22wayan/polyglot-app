import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, RotateCcw, Lock, Download, Upload, Key } from 'lucide-react';
import { LANGUAGES, LANG_ORDER } from '../data';

// ---------- LANGS / SETUP ----------
export function LangsView({ activeLangs, onToggle, onGenerate, generating, genError, vocab, scripts, hasApiKey, onReset, onExport, onImport }) {
  const fileInput = useRef(null);
  const [shake, setShake] = useState(null);

  const tryToggle = (lang) => {
    if (activeLangs.length === 1 && activeLangs.includes(lang)) {
      // Last active language — visually nudge instead of silently failing
      setShake(lang);
      setTimeout(() => setShake(null), 600);
      return;
    }
    onToggle(lang);
  };

  return (
    <div className="flex-1 py-4 scroll-y">
      <h2 className="font-display text-[28px] leading-tight mb-1">Setup</h2>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40 mb-6">sprachen · ki · backup</p>

      <div className="space-y-2 mb-6">
        {LANG_ORDER.map(lang => {
          const L = LANGUAGES[lang];
          const active = activeLangs.includes(lang);
          const v_total = vocab.filter(c => c.lang === lang).length;
          const s_total = scripts.filter(c => c.lang === lang).length;
          const isGen = generating === `vocab_${lang}`;
          const isShaking = shake === lang;
          return (
            <div
              key={lang}
              className={`rounded-2xl p-4 flex items-center gap-3 ${isShaking ? 'shake-anim' : ''}`}
              style={{
                background: 'rgba(232,220,196,0.025)',
                border: `1px solid ${active ? L.accent + '40' : 'rgba(232,220,196,0.08)'}`,
              }}
            >
              <button
                onClick={() => tryToggle(lang)}
                aria-pressed={active}
                aria-label={`${L.name} ${active ? 'aktiv' : 'inaktiv'} — umschalten`}
                className="flex items-center gap-3 flex-1 text-left min-h-[44px]"
              >
                <span className="text-xl" aria-hidden="true">{L.flag}</span>
                <div className="flex-1">
                  <div className="font-display text-[16px] leading-tight" style={{ color: active ? '#E8DCC4' : 'rgba(232,220,196,0.5)' }}>{L.name}</div>
                  <div className="font-mono text-[10px] opacity-50 tabular-nums">{v_total} vokabeln{L.script ? ` · ${s_total} zeichen` : ''}</div>
                </div>
                <div className="w-9 h-5 rounded-full relative shrink-0" style={{ background: active ? L.accent : 'rgba(232,220,196,0.1)' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left: active ? 'calc(100% - 18px)' : '2px', background: active ? '#0F0E0D' : '#E8DCC4' }} />
                </div>
              </button>
              <button
                onClick={() => onGenerate(lang)}
                disabled={!!generating || !hasApiKey || !active}
                aria-label={hasApiKey ? `8 neue KI-Karten für ${L.name} generieren` : 'API-Key fehlt'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl shrink-0 disabled:opacity-30 min-h-[44px]"
                style={{ background: `${L.accent}15`, border: `1px solid ${L.accent}30`, color: L.accent }}
                title={hasApiKey ? '8 neue KI-Karten' : 'API-Key fehlt'}
              >
                {isGen ? <Loader2 size={13} className="animate-spin" /> : hasApiKey ? <Sparkles size={13} /> : <Lock size={12} />}
                <span className="font-mono text-[10px] uppercase tracking-wider">+8</span>
              </button>
            </div>
          );
        })}
      </div>

      {genError && <div role="alert" className="rounded-xl p-3 mb-4 font-mono text-[11px]" style={{ background: '#FF6B6B15', color: '#FF6B6B', border: '1px solid #FF6B6B30' }}>⚠ {genError}</div>}

      {/* API Key info */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: hasApiKey ? '#4ADE8010' : 'rgba(232,220,196,0.025)', border: `1px solid ${hasApiKey ? '#4ADE8030' : 'rgba(232,220,196,0.08)'}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Key size={14} style={{ color: hasApiKey ? '#4ADE80' : '#E8DCC4', opacity: 0.7 }} aria-hidden="true" />
          <div className="font-display text-[14px]">KI-Features {hasApiKey ? '· aktiv' : '· gesperrt'}</div>
        </div>
        <div className="text-[12px] opacity-80 leading-relaxed">
          {hasApiKey
            ? 'Stories, Chat und Karten-Generator stehen zur Verfügung.'
            : 'Stories, Chat und Karten-Generator brauchen einen Anthropic-API-Key in den Vercel-ENV-Variablen.'}
        </div>
      </div>

      {/* Backup */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(232,220,196,0.025)', border: '1px solid rgba(232,220,196,0.08)' }}>
        <div className="font-display text-[14px] mb-3">Backup</div>
        <div className="flex gap-2">
          <button onClick={onExport} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl min-h-[44px]" style={{ background: 'rgba(232,220,196,0.04)', border: '1px solid rgba(232,220,196,0.1)' }}>
            <Download size={13} />
            <span className="font-mono text-[10px] uppercase tracking-wider">Export</span>
          </button>
          <button onClick={() => fileInput.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl min-h-[44px]" style={{ background: 'rgba(232,220,196,0.04)', border: '1px solid rgba(232,220,196,0.1)' }}>
            <Upload size={13} />
            <span className="font-mono text-[10px] uppercase tracking-wider">Import</span>
          </button>
          <input type="file" ref={fileInput} accept=".json" hidden onChange={(e) => {
            const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '';
          }} />
        </div>
        <div className="font-mono text-[10px] opacity-60 mt-2 leading-relaxed">JSON-Datei mit Karten, Schrift, Stories, Chats. Manuell sicher in iCloud Drive ablegen wenn du paranoid bist.</div>
      </div>

      <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(232,220,196,0.025)', border: '1px solid rgba(232,220,196,0.08)' }}>
        <div className="font-display text-[14px] mb-2">v4.0.1 — was drin ist</div>
        <ul className="space-y-1.5 text-[12px] opacity-70 leading-relaxed">
          <li>• <span className="font-mono text-[11px]">FSRS-4</span> Spaced Repetition</li>
          <li>• <span className="font-mono text-[11px]">IndexedDB</span> Persistenz (überlebt Cache-Clear)</li>
          <li>• <span className="font-mono text-[11px]">Schrift</span>: Kyrillisch + Hanzi mit eigenem SRS</li>
          <li>• <span className="font-mono text-[11px]">Lesen/Chat</span>: aktiv mit API-Key</li>
          <li>• <span className="font-mono text-[11px]">Aussprache-Score</span> mit Mikrofon (wo verfügbar)</li>
          <li>• <span className="font-mono text-[11px]">PWA</span> · Home-Screen-Icon</li>
        </ul>
      </div>

      <button onClick={onReset} className="w-full py-3 rounded-xl font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-90 min-h-[44px]" style={{ border: '1px solid rgba(232,220,196,0.1)' }}>
        <RotateCcw size={11} className="inline mr-1.5 -mt-0.5" />Alles zurücksetzen
      </button>
    </div>
  );
}
