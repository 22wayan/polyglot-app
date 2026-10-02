import React from 'react';
import { Volume2, ChevronDown, ChevronUp, BookOpen, MessageCircle } from 'lucide-react';
import { LANGUAGES, RATINGS, NEW_PER_DAY } from '../data';
import { speak } from '../ai';
import { MicButton, EmptyState } from './ui';

// ---------- STUDY ----------
export function StudyView({ card, revealed, onShow, onRate, accent, grammarOpen, onToggleGrammar, newToday, onNavigate }) {
  if (!card) {
    return (
      <EmptyState
        title="Alles aufgeholt."
        hint="Komm morgen wieder, lies eine Geschichte oder chatte mit dem Tutor."
        ctas={[
          { label: 'Lesen', icon: <BookOpen size={13} />, onClick: () => onNavigate?.('stories') },
          { label: 'Chatten', icon: <MessageCircle size={13} />, onClick: () => onNavigate?.('chat') },
        ]}
      />
    );
  }
  const lang = LANGUAGES[card.lang];
  const isNew = card.state === 'new';
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div key={card.id} className="card-anim flex-1 my-4 rounded-3xl p-7 flex flex-col relative overflow-hidden scroll-y" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.015) 100%)',
        border: `1px solid ${accent}30`, boxShadow: `0 1px 0 0 ${accent}10 inset, 0 24px 60px -30px ${accent}15`,
      }}>
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)` }} />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none" aria-hidden="true">{lang.flag}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>{lang.label} · {card.type}</span>
            {isNew && (
              <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${accent}20`, color: accent }}>
                neu {newToday + 1}/{NEW_PER_DAY}
              </span>
            )}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-30">{card.stability ? `S: ${card.stability.toFixed(1)}d` : 'rep 0'}</div>
        </div>
        <div className="flex-1 flex flex-col justify-center py-6 relative z-10">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-40 mb-3">Deutsch</div>
          <div className="font-display text-[34px] leading-[1.1] tracking-tight">{card.de}</div>
          <div className="my-7 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }} />
          {revealed ? (
            <div className="reveal-anim">
              <div className="flex items-center justify-between mb-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-40">{lang.name}</div>
                <button
                  onClick={() => speak(card.target, lang.tts)}
                  aria-label="Aussprache anhören"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full min-h-[36px]"
                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
                >
                  <Volume2 size={13} /><span className="font-mono text-[10px] uppercase tracking-wider">hör</span>
                </button>
              </div>
              <div className={`font-display text-[30px] leading-[1.15] tracking-tight ${card.lang === 'zh' ? 'font-han' : ''}`} style={{ color: accent }}>{card.target}</div>
              {card.pronunciation && <div className="font-mono text-[14px] mt-3 opacity-60">{card.pronunciation}</div>}
              <MicButton target={card.target} langCode={lang.tts} accent={accent} />
              {card.grammar && (
                <div className="mt-5">
                  <button
                    onClick={onToggleGrammar}
                    aria-expanded={grammarOpen}
                    className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] opacity-60 hover:opacity-100 min-h-[36px]"
                  >
                    {grammarOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Grammatik <span className="opacity-40">[g]</span>
                  </button>
                  {grammarOpen && (
                    <div className="grammar-anim mt-2 p-3 rounded-xl text-[12px] leading-relaxed opacity-90" style={{ background: `${accent}08`, border: `1px solid ${accent}20` }}>
                      {card.grammar}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="opacity-30 font-display text-[30px] leading-[1.15] select-none" style={{ color: accent }}>
              {'•'.repeat(Math.min(card.target.length, 18))}
            </div>
          )}
        </div>
      </div>
      <div className="pb-2">
        {!revealed ? (
          <button
            onClick={onShow}
            className="w-full py-4 rounded-2xl font-mono text-[12px] uppercase tracking-[0.25em]"
            style={{ background: '#E8DCC4', color: '#0F0E0D' }}
          >
            Zeig die Antwort <span className="opacity-50">[ ␣ ]</span>
          </button>
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
