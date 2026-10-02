import React from 'react';
import { Volume2, Lock } from 'lucide-react';
import { LANGUAGES, RATINGS } from '../data';
import { speak } from '../ai';
import { IconButton, EmptyState } from './ui';

// ---------- SCRIPT ----------
function ScriptPick({ lang, name, count, learned, active, onClick }) {
  const L = LANGUAGES[lang];
  const pct = count ? Math.round((learned / count) * 100) : 0;
  return (
    <button onClick={onClick} disabled={!active} className="w-full mb-3 rounded-2xl p-4 text-left disabled:opacity-30 disabled:cursor-not-allowed" style={{
      background: 'rgba(232,220,196,0.025)', border: `1px solid ${L.accent}${active ? '40' : '15'}`,
    }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl" aria-hidden="true">{L.flag}</span>
        <div className="flex-1">
          <div className="font-display text-[18px] leading-tight">{name}</div>
          <div className="font-mono text-[10px] opacity-50 tabular-nums">{learned}/{count} gelernt</div>
        </div>
        {!active && <Lock size={14} className="opacity-50" aria-label="gesperrt" />}
        <span className="font-mono text-[14px] tabular-nums" style={{ color: L.accent }}>{pct}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(232,220,196,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: L.accent }} />
      </div>
    </button>
  );
}

export function ScriptView({ lang, onChooseLang, card, revealed, onShow, onRate, onBack, scripts, activeLangs }) {
  if (!lang) {
    const ru = scripts.filter(c => c.lang === 'ru');
    const zh = scripts.filter(c => c.lang === 'zh');
    return (
      <div className="flex-1 py-4 scroll-y">
        <h2 className="font-display text-[28px] leading-tight mb-1">Schrift lernen</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40 mb-6">erst lesen, dann sprechen</p>
        <ScriptPick lang="ru" name="Kyrillisch" count={ru.length} learned={ru.filter(c => c.reps >= 2).length} active={activeLangs.includes('ru')} onClick={() => onChooseLang('ru')} />
        <ScriptPick lang="zh" name="Hanzi (HSK 1)" count={zh.length} learned={zh.filter(c => c.reps >= 2).length} active={activeLangs.includes('zh')} onClick={() => onChooseLang('zh')} />
      </div>
    );
  }
  if (!card) {
    return (
      <EmptyState
        title="Schrift fertig."
        hint="Alles für jetzt durch."
        ctas={[{ label: '← Zurück', onClick: onBack }]}
      />
    );
  }
  const L = LANGUAGES[card.lang]; const accent = L.accent; const isHanzi = card.lang === 'zh';
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <button onClick={onBack} className="self-start font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 mb-2 px-2 py-2 min-h-[36px]">← Schrift-Auswahl</button>
      <div key={card.id} className="card-anim flex-1 my-2 rounded-3xl p-7 flex flex-col relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.015) 100%)',
        border: `1px solid ${accent}30`, boxShadow: `0 1px 0 0 ${accent}10 inset, 0 24px 60px -30px ${accent}15`,
      }}>
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)` }} />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">{L.flag}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>{L.label} · zeichen {card.order}</span>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-30">{card.stability ? `S: ${card.stability.toFixed(1)}d` : 'neu'}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-4 relative z-10">
          <div className={`leading-none mb-4 ${isHanzi ? 'font-han' : 'font-display'}`} style={{ fontSize: isHanzi ? '140px' : '120px', color: '#E8DCC4' }}>{card.char}</div>
          {revealed ? (
            <div className="reveal-anim w-full text-center">
              <div className="font-mono text-[20px] mb-1" style={{ color: accent }}>{card.romanization}</div>
              {!isHanzi && <div className="text-[13px] opacity-70 max-w-[280px] mx-auto leading-relaxed mb-4">{card.hint}</div>}
              {isHanzi && <div className="text-[14px] opacity-80 mb-4">Bedeutung: <span style={{ color: accent }}>{card.hint}</span></div>}
              <div className="my-4 mx-8 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }} />
              <div className="flex items-center justify-center gap-3">
                <div className={`text-[24px] ${isHanzi ? 'font-han' : 'font-display'}`} style={{ color: accent }}>{card.example}</div>
                <IconButton onClick={() => speak(card.example, L.tts)} ariaLabel="Beispiel anhören" accent={accent}>
                  <Volume2 size={14} />
                </IconButton>
              </div>
              <div className="font-mono text-[12px] opacity-60 mt-1">{card.example_meaning}</div>
            </div>
          ) : (
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-30 mt-6">wie wird das gesprochen?</div>
          )}
        </div>
      </div>
      <div className="pb-2">
        {!revealed ? (
          <button onClick={onShow} className="w-full py-4 rounded-2xl font-mono text-[12px] uppercase tracking-[0.25em]" style={{ background: '#E8DCC4', color: '#0F0E0D' }}>Zeig Aussprache <span className="opacity-50">[ ␣ ]</span></button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map(r => (
              <button
                key={r.id}
                onClick={() => onRate(r.id)}
                aria-label={`Bewertung: ${r.label} (${r.sub})`}
                className="flex flex-col items-center justify-center py-3 rounded-2xl min-h-[60px]"
                style={{ background: `${r.tone}10`, border: `1px solid ${r.tone}30`, color: r.tone }}
              >
                <span className="font-display text-[15px] leading-none mb-0.5">{r.label}</span>
                <span className="font-mono text-[8px] uppercase tracking-wider opacity-60">{r.sub}</span>
                <span className="font-mono text-[8px] mt-1 opacity-40">[{r.key}]</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
