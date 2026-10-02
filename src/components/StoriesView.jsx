import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { LANGUAGES, LANG_ORDER } from '../data';
import { speak } from '../ai';
import { IconButton, MicButton, WordChip, LockedAI } from './ui';

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
