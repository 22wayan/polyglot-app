import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2, Sparkles, Loader2, RotateCcw, Lock, Plus,
  ChevronDown, ChevronUp, Mic, Send, ArrowRight, Check, AlertCircle, Trash2,
  Download, Upload, Key, BookOpen, MessageCircle
} from 'lucide-react';
import { LANGUAGES, LANG_ORDER, RATINGS, NEW_PER_DAY } from './data';
import { speak, recognizeSpeech, similarity, speechRecognitionAvailable } from './ai';
import { effectiveStreak } from './fsrs';

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
function IconButton({ onClick, ariaLabel, children, accent, disabled, className = '', style = {}, title }) {
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

  // Don't render at all if SR is broken (e.g. iOS-PWA Apple bug)
  if (!speechRecognitionAvailable()) return null;

  useEffect(() => () => { abortRef.current?.abort?.(); }, []);

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
        Diese Funktion ruft die Anthropic-API. Du brauchst einen Key auf <span className="font-mono text-[12px]">console.anthropic.com</span> (kostet ~1-3€/Monat bei deinem Use-Case).
      </p>
      <div className="rounded-2xl p-4 max-w-[320px] text-left" style={{ background: 'rgba(232,220,196,0.025)', border: '1px solid rgba(232,220,196,0.1)' }}>
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-60 mb-2">Wenn du den Key hast:</div>
        <pre className="font-mono text-[11px] leading-relaxed opacity-80 whitespace-pre-wrap">{`vercel env add \\
  ANTHROPIC_API_KEY
vercel deploy --prod`}</pre>
      </div>
    </div>
  );
}

// ---------- Empty state with optional CTAs ----------
function EmptyState({ title, hint, ctas = [] }) {
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

// ---------- STORIES ----------
export function StoriesView({ stories, activeLangs, storyLang, setStoryLang, activeStoryId, setActiveStoryId, onGenerate, generating, genError, hasApiKey, onMineWord, onDeleteStory, onComplete }) {
  if (!hasApiKey && !storyLang) return <LockedAI feature="Stories" />;

  if (storyLang && activeStoryId) {
    const story = stories.find(s => s.id === activeStoryId);
    if (!story) { setActiveStoryId(null); return null; }
    return <StoryReader story={story} lang={storyLang}
      onBack={() => setActiveStoryId(null)} onMineWord={onMineWord}
      onComplete={() => { onComplete(story.id); setActiveStoryId(null); }} />;
  }

  return (
    <div className="flex-1 py-4 scroll-y">
      <h2 className="font-display text-[28px] leading-tight mb-1">Lesen</h2>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40 mb-6">comprehensible input · ki-stories</p>

      {!storyLang ? (
        <>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50 mb-3">Sprache wählen</div>
          <div className="grid grid-cols-2 gap-2">
            {LANG_ORDER.map(l => {
              const L = LANGUAGES[l];
              const active = activeLangs.includes(l);
              const count = stories.filter(s => s.lang === l).length;
              return (
                <button
                  key={l}
                  onClick={() => active && setStoryLang(l)}
                  disabled={!active}
                  aria-label={`${L.name} — ${count} ${count === 1 ? 'Geschichte' : 'Geschichten'}`}
                  className="rounded-2xl p-3 text-left disabled:opacity-30 min-h-[64px]"
                  style={{ background: 'rgba(232,220,196,0.025)', border: `1px solid ${active ? L.accent + '30' : 'rgba(232,220,196,0.08)'}` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base" aria-hidden="true">{L.flag}</span>
                    <span className="font-display text-[14px]">{L.name}</span>
                  </div>
                  <div className="font-mono text-[10px] opacity-50">{count} {count === 1 ? 'geschichte' : 'geschichten'}</div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <StoryList lang={storyLang} stories={stories.filter(s => s.lang === storyLang)}
          onBack={() => setStoryLang(null)} onOpen={(id) => setActiveStoryId(id)}
          onGenerate={() => onGenerate(storyLang)} generating={generating === `story_${storyLang}`}
          genError={genError} onDelete={onDeleteStory} />
      )}
    </div>
  );
}

function StoryList({ lang, stories, onBack, onOpen, onGenerate, generating, genError, onDelete }) {
  const L = LANGUAGES[lang];
  return (
    <>
      <button onClick={onBack} className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 mb-3 px-2 py-2 min-h-[36px]">← Sprachen</button>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg" aria-hidden="true">{L.flag}</span>
        <span className="font-display text-[20px]">{L.name}</span>
      </div>
      <button onClick={onGenerate} disabled={generating} className="w-full mb-4 py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]" style={{
        background: `${L.accent}15`, border: `1px solid ${L.accent}40`, color: L.accent,
      }}>
        {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">{generating ? 'generiere...' : 'neue geschichte'}</span>
      </button>
      {genError && <div role="alert" className="rounded-xl p-3 mb-4 font-mono text-[11px]" style={{ background: '#FF6B6B15', color: '#FF6B6B', border: '1px solid #FF6B6B30' }}>⚠ {genError}</div>}
      {stories.length === 0 && !generating && <div className="text-center py-8 opacity-50 text-sm">Noch keine Geschichten. Generier dir eine.</div>}
      {stories.slice().reverse().map(s => (
        <div key={s.id} className="w-full mb-2 rounded-2xl flex items-center gap-3 group" style={{
          background: 'rgba(232,220,196,0.025)', border: `1px solid ${L.accent}${s.completed ? '40' : '20'}`,
        }}>
          <button onClick={() => onOpen(s.id)} className="flex-1 min-w-0 text-left p-4 rounded-2xl">
            <div className="font-display text-[15px] truncate">{s.title}</div>
            <div className="font-mono text-[10px] opacity-50 mt-0.5">
              {s.theme && <span className="mr-2">{s.theme}</span>}
              {s.sentences.length} Sätze {s.completed && '· ✓ gelesen'}
            </div>
          </button>
          <IconButton onClick={() => onDelete(s.id)} ariaLabel={`Geschichte ${s.title} löschen`} className="opacity-40 hover:opacity-100 mr-2">
            <Trash2 size={13} />
          </IconButton>
          <ArrowRight size={14} style={{ color: L.accent, opacity: 0.6 }} className="mr-3" aria-hidden="true" />
        </div>
      ))}
    </>
  );
}

function StoryReader({ story, lang, onBack, onMineWord, onComplete }) {
  const [idx, setIdx] = useState(0);
  const [showTrans, setShowTrans] = useState(false);
  const L = LANGUAGES[lang]; const accent = L.accent;
  const sentence = story.sentences[idx];
  const isHan = lang === 'zh';
  useEffect(() => {
    setShowTrans(false);
    const t = setTimeout(() => speak(sentence.target, L.tts), 250);
    return () => clearTimeout(t);
  }, [idx, sentence.target, L.tts]);
  const isLast = idx === story.sentences.length - 1;
  const progressPct = ((idx + 1) / story.sentences.length) * 100;
  return (
    <div className="flex-1 flex flex-col min-h-0 py-4">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} aria-label="Zurück zur Liste" className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 px-2 py-2 min-h-[36px]">← zurück</button>
        <div className="font-mono text-[10px] tabular-nums opacity-60">{idx + 1} / {story.sentences.length}</div>
      </div>
      <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(232,220,196,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: accent }} />
      </div>
      <div className="font-display text-[20px] leading-tight mb-1">{story.title}</div>
      {story.theme && <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40 mb-4">{story.theme}</div>}
      <div className="flex-1 flex flex-col scroll-y">
        <div className="card-anim rounded-3xl p-6 mb-4" key={idx} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${accent}30` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-40">{L.label}</div>
            <IconButton onClick={() => speak(sentence.target, L.tts)} ariaLabel="Satz anhören" accent={accent}>
              <Volume2 size={13} />
            </IconButton>
          </div>
          <div className={`font-display text-[22px] leading-snug ${isHan ? 'font-han' : ''}`} style={{ color: accent }}>{sentence.target}</div>
          {sentence.pronunciation && <div className="font-mono text-[12px] mt-2 opacity-60">{sentence.pronunciation}</div>}
          <div className="my-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }} />
          {showTrans ? (
            <div className="reveal-anim text-[14px] opacity-90 leading-relaxed">{sentence.translation}</div>
          ) : (
            <button onClick={() => setShowTrans(true)} className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 min-h-[36px]">↓ Übersetzung zeigen</button>
          )}
          <MicButton target={sentence.target} langCode={L.tts} accent={accent} />
        </div>
        {sentence.newWords && sentence.newWords.length > 0 && (
          <div className="mb-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-50 mb-2">+ Wörter ins Deck</div>
            <div className="flex flex-wrap">
              {sentence.newWords.map((w, i) => (
                <WordChip key={i} word={w} accent={accent} isHan={isHan}
                  onMine={() => onMineWord(lang, w.word, w.translation, w.pronunciation)} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 pb-2">
        {idx > 0 && (
          <button
            onClick={() => setIdx(i => i - 1)}
            aria-label="Vorheriger Satz"
            className="px-4 py-3 rounded-2xl font-mono text-[11px] uppercase tracking-[0.2em] opacity-80 min-h-[48px]"
            style={{ border: '1px solid rgba(232,220,196,0.15)' }}
          >← prev</button>
        )}
        {!isLast ? (
          <button onClick={() => setIdx(i => i + 1)} className="flex-1 py-3 rounded-2xl font-mono text-[11px] uppercase tracking-[0.25em] min-h-[48px]" style={{ background: '#E8DCC4', color: '#0F0E0D' }}>weiter →</button>
        ) : (
          <button onClick={onComplete} className="flex-1 py-3 rounded-2xl font-mono text-[11px] uppercase tracking-[0.25em] min-h-[48px]" style={{ background: accent, color: '#0F0E0D' }}>als gelesen ✓</button>
        )}
      </div>
    </div>
  );
}

// ---------- CHAT ----------
export function ChatView({ chats, activeLangs, chatLang, setChatLang, onStart, onSend, onReset, generating, genError, hasApiKey, onMineWord }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  if (!hasApiKey && !chatLang) return <LockedAI feature="Chat-Tutor" />;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chats, chatLang, generating]);

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
  return (
    <div className="flex flex-col items-start gap-1 max-w-[90%]">
      {msg.correction && (
        <div className="rounded-xl px-3 py-2 mb-1 text-[12px] opacity-90" style={{ background: '#FFB84D15', border: '1px solid #FFB84D30', color: '#FFB84D' }}>
          <div className="font-mono text-[9px] uppercase tracking-wider opacity-70 mb-1">Korrektur</div>
          <div className={`text-[13px] mb-1 ${isHan ? 'font-han' : ''}`}>{msg.correction}</div>
          {msg.correctionExplanation && <div className="text-[11px] opacity-80 italic">{msg.correctionExplanation}</div>}
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

function ChatMicButton({ lang, accent, onResult }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const langCode = LANGUAGES[lang].tts;

  if (!speechRecognitionAvailable()) return null;

  useEffect(() => () => { abortRef.current?.abort?.(); }, []);

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

// ---------- STATS ----------
function Metric({ value, label, sub }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(232,220,196,0.04)', border: '1px solid rgba(232,220,196,0.08)' }}>
      <div className="font-display text-[28px] leading-none tabular-nums">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-60 mt-2">{label}</div>
      <div className="font-mono text-[9px] opacity-40">{sub}</div>
    </div>
  );
}

export function StatsView({ meta, vocab, scripts, stories, chats }) {
  const newTodayTotal = Object.values(meta.newToday || {}).reduce((a, b) => a + b, 0);
  const totalMined = vocab.filter(c => c.id.startsWith('mined_')).length;
  const streakLive = effectiveStreak(meta);
  const now = Date.now();
  return (
    <div className="flex-1 py-4 scroll-y">
      <h2 className="font-display text-[28px] leading-tight mb-1">Fortschritt</h2>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40 mb-6">fsrs · stories · chats</p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        <Metric value={streakLive} label="streak" sub={streakLive ? 'tage am stück' : 'noch nichts heute'} />
        <Metric value={meta.todayReviewed || 0} label="heute" sub={`davon ${newTodayTotal} neu`} />
        <Metric value={meta.totalReviewed || 0} label="insgesamt" sub="alle reviews" />
        <Metric value={totalMined} label="mined" sub="aus stories+chat" />
      </div>
      <div className="space-y-3">
        {LANG_ORDER.map(lang => {
          const L = LANGUAGES[lang];
          const vc = vocab.filter(c => c.lang === lang);
          const sc = scripts.filter(c => c.lang === lang);
          const v_total = vc.length;
          const v_learned = vc.filter(c => c.reps >= 2 && c.state === 'review').length;
          const v_due = vc.filter(c => c.state !== 'new' && c.due <= now).length;
          const v_new = vc.filter(c => c.state === 'new').length;
          const s_total = sc.length;
          const s_learned = sc.filter(c => c.reps >= 2).length;
          const pct = v_total ? Math.round((v_learned / v_total) * 100) : 0;
          const sPct = s_total ? Math.round((s_learned / s_total) * 100) : 0;
          const active = (meta.activeLangs || LANG_ORDER).includes(lang);
          const hasScript = !!L.script;
          const storiesCount = stories.filter(s => s.lang === lang).length;
          const chatsCount = chats.filter(m => m.lang === lang).length;
          return (
            <div key={lang} className="rounded-2xl p-4" style={{ background: 'rgba(232,220,196,0.025)', border: `1px solid ${L.accent}${active ? '25' : '10'}`, opacity: active ? 1 : 0.45 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">{L.flag}</span>
                  <span className="font-display text-[16px]">{L.name}</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums" style={{ color: L.accent }}>{pct}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(232,220,196,0.06)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: L.accent }} />
              </div>
              <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider opacity-60 mb-2">
                <span>vokabeln {v_learned}/{v_total}</span>
                <span>{v_due} fällig · {v_new} neu</span>
              </div>
              {hasScript && (
                <>
                  <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(232,220,196,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${sPct}%`, background: L.accent, opacity: 0.5 }} />
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider opacity-50 mb-2">schrift {s_learned}/{s_total} ({sPct}%)</div>
                </>
              )}
              <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider opacity-50">
                <span>{storiesCount} stories</span>
                <span>{chatsCount} nachrichten</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
