import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Brain, BookOpen, MessageCircle, Languages, BarChart3, Type } from 'lucide-react';
import { db, getMeta, updateMeta, commitReview, mineWord as dbMineWord, maybeRolloverDay, exportJSON, importJSON, resetAll } from './db';
import { applyFSRS, effectiveStreak } from './fsrs';
import { LANGUAGES, LANG_ORDER, NEW_PER_DAY } from './data';
import * as ai from './ai';
import {
  Pill, TabBtn, StudyView, ScriptView, StoriesView, ChatView, StatsView, LangsView,
} from './components';

export default function App() {
  // ---------- Reactive queries from IndexedDB ----------
  const meta = useLiveQuery(() => db.meta.get('global'));
  const vocab = useLiveQuery(() => db.vocab.toArray(), [], []);
  const scripts = useLiveQuery(() => db.scripts.toArray(), [], []);
  const stories = useLiveQuery(() => db.stories.toArray(), [], []);
  const chats = useLiveQuery(() => db.chatMessages.toArray(), [], []);

  // ---------- Local UI state (not persisted) ----------
  const [view, setView] = useState('study');
  const [scriptLang, setScriptLang] = useState(null);
  const [storyLang, setStoryLang] = useState(null);
  const [activeStoryId, setActiveStoryId] = useState(null);
  const [chatLang, setChatLang] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [genError, setGenError] = useState(null);
  const [flash, setFlash] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true); // optimistic; gets corrected on first 503

  // ---------- Day rollover on mount ----------
  useEffect(() => { maybeRolloverDay(); }, []);

  // ---------- Probe API once at mount to set lock state ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await ai.probeApiKey();
      if (!cancelled) setHasApiKey(ok);
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-check after the user saves or removes their own key in Setup.
  const refreshApiKey = useCallback(async () => {
    setGenError(null);
    setHasApiKey(await ai.probeApiKey());
  }, []);

  // ---------- Curriculum: pick next vocab card ----------
  const currentVocab = useMemo(() => {
    if (!meta || !vocab.length) return null;
    const now = Date.now();
    const activeLangs = meta.activeLangs || LANG_ORDER;
    const newToday = meta.newToday || {};
    const eligible = vocab.filter(c => activeLangs.includes(c.lang));
    const due = eligible.filter(c => c.state !== 'new' && c.due <= now);
    const newCards = eligible.filter(c => c.state === 'new')
      .filter(c => (newToday[c.lang] || 0) < NEW_PER_DAY)
      .sort((a, b) => a.order - b.order);
    // 70% review / 30% new ratio when both available
    if (due.length && newCards.length) {
      return Math.random() < 0.7
        ? due.sort((a, b) => a.due - b.due)[0]
        : newCards[0];
    }
    if (due.length) return due.sort((a, b) => a.due - b.due)[0];
    if (newCards.length) return newCards[0];
    return null;
  }, [vocab, meta]);

  const currentScript = useMemo(() => {
    if (!scriptLang || !scripts.length || !meta) return null;
    const now = Date.now();
    const newToday = meta.newToday || {};
    const newKey = `script_${scriptLang}`;
    const filtered = scripts.filter(c => c.lang === scriptLang);
    const due = filtered.filter(c => c.state !== 'new' && c.due <= now);
    const newCards = filtered.filter(c => c.state === 'new')
      .filter(() => (newToday[newKey] || 0) < NEW_PER_DAY)
      .sort((a, b) => a.order - b.order);
    if (due.length && newCards.length) {
      return Math.random() < 0.7 ? due.sort((a, b) => a.due - b.due)[0] : newCards[0];
    }
    if (due.length) return due.sort((a, b) => a.due - b.due)[0];
    if (newCards.length) return newCards[0];
    return null;
  }, [scripts, scriptLang, meta]);

  // ---------- Handlers ----------
  const handleShow = useCallback(() => {
    setRevealed(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 280);
  }, []);

  const handleRateVocab = useCallback(async (rating) => {
    if (!currentVocab) return;
    const updated = applyFSRS(currentVocab, rating);
    const wasNew = currentVocab.state === 'new';
    await commitReview(db.vocab, updated, wasNew, currentVocab.lang);
    setRevealed(false);
    setGrammarOpen(false);
  }, [currentVocab]);

  const handleRateScript = useCallback(async (rating) => {
    if (!currentScript) return;
    const updated = applyFSRS(currentScript, rating);
    const wasNew = currentScript.state === 'new';
    await commitReview(db.scripts, updated, wasNew, `script_${currentScript.lang}`);
    setRevealed(false);
  }, [currentScript]);

  // ---------- Word mining ----------
  const mineWord = useCallback(async (lang, word, translation, pron = '') => {
    return await dbMineWord(lang, word, translation, pron);
  }, []);

  // ---------- KI: vocab generator ----------
  const handleGenerateVocab = useCallback(async (lang) => {
    setGenerating(`vocab_${lang}`); setGenError(null);
    try {
      const existing = vocab.filter(c => c.lang === lang).slice(0, 50).map(c => `${c.de}=${c.target}`);
      const cards = await ai.generateCards(lang, existing);
      if (cards.length) await db.vocab.bulkAdd(cards);
    } catch (e) {
      if (e instanceof ai.NoApiKeyError) { setHasApiKey(false); setGenError('API-Key fehlt, trag deinen eigenen im Setup-Tab ein'); }
      else { setGenError(e.message); }
    } finally { setGenerating(null); }
  }, [vocab]);

  const handleGenerateStory = useCallback(async (lang) => {
    setGenerating(`story_${lang}`); setGenError(null);
    try {
      const existing = stories.filter(s => s.lang === lang).map(s => s.title);
      const story = await ai.generateStory(lang, existing);
      await db.stories.put(story);
      setActiveStoryId(story.id);
    } catch (e) {
      if (e instanceof ai.NoApiKeyError) { setHasApiKey(false); setGenError('API-Key fehlt, trag deinen eigenen im Setup-Tab ein'); }
      else { setGenError(e.message); }
    } finally { setGenerating(null); }
  }, [stories]);

  const handleDeleteStory = useCallback(async (id) => {
    await db.stories.delete(id);
  }, []);

  const handleCompleteStory = useCallback(async (id) => {
    const s = await db.stories.get(id);
    if (s) await db.stories.put({ ...s, completed: true });
  }, []);

  // ---------- Chat ----------
  const startChat = useCallback(async (lang) => {
    setChatLang(lang);
    const existingCount = await db.chatMessages.where({ lang }).count();
    if (existingCount === 0) {
      setGenerating('chat'); setGenError(null);
      try {
        const start = await ai.chatStart(lang);
        await db.chatMessages.add({
          role: 'assistant', lang, ts: Date.now(),
          target: start.reply || '', pronunciation: start.pronunciation || '',
          translation: start.replyTranslation || '', newWords: start.newWords || [],
        });
      } catch (e) {
        if (e instanceof ai.NoApiKeyError) { setHasApiKey(false); setGenError('API-Key fehlt'); setChatLang(null); }
        else { setGenError(e.message); }
      } finally { setGenerating(null); }
    }
  }, []);

  const sendChat = useCallback(async (text) => {
    if (!chatLang) return;
    await db.chatMessages.add({ role: 'user', lang: chatLang, ts: Date.now(), target: text });
    setGenerating('chat'); setGenError(null);
    try {
      // Pull authoritative history from DB to avoid stale-closure races on rapid sends
      const dbMessages = await db.chatMessages.where({ lang: chatLang }).sortBy('ts');
      const history = dbMessages.map(m => ({ role: m.role, target: m.target }));
      const reply = await ai.chatTurn(chatLang, history, text);
      await db.chatMessages.add({
        role: 'assistant', lang: chatLang, ts: Date.now(),
        target: reply.reply || '', pronunciation: reply.pronunciation || '',
        translation: reply.replyTranslation || '',
        correction: reply.correction || null,
        correctionExplanation: reply.correctionExplanation || null,
        newWords: reply.newWords || [],
      });
    } catch (e) {
      if (e instanceof ai.NoApiKeyError) { setHasApiKey(false); setGenError('API-Key fehlt'); }
      else { setGenError(e.message); }
    } finally { setGenerating(null); }
  }, [chatLang]);

  const resetChat = useCallback(async (lang) => {
    if (!confirm('Diesen Chat wirklich löschen?')) return;
    await db.chatMessages.where({ lang }).delete();
  }, []);

  // ---------- Lang toggle ----------
  const toggleLang = useCallback(async (lang) => {
    const cur = await getMeta();
    const list = cur.activeLangs || LANG_ORDER;
    const next = list.includes(lang) ? list.filter(l => l !== lang) : [...list, lang];
    if (next.length === 0) return; // need at least one
    await updateMeta({ activeLangs: next });
  }, []);

  // ---------- Reset / Export / Import ----------
  const handleReset = useCallback(async () => {
    if (!confirm('Alles löschen? Backup vorher exportieren!')) return;
    await resetAll();
    location.reload();
  }, []);

  const handleImport = useCallback(async (file) => {
    if (!confirm('Aktuelle Daten überschreiben?')) return;
    try { await importJSON(file); alert('Import erfolgreich.'); location.reload(); }
    catch (e) { alert(`Fehler: ${e.message}`); }
  }, []);

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (view !== 'study' && view !== 'script') return;
      const card = view === 'study' ? currentVocab : currentScript;
      if (!card) return;
      if (e.code === 'Space') { e.preventDefault(); if (!revealed) handleShow(); }
      else if (revealed) {
        if (e.key === '1') (view === 'study' ? handleRateVocab : handleRateScript)('again');
        else if (e.key === '2') (view === 'study' ? handleRateVocab : handleRateScript)('hard');
        else if (e.key === '3') (view === 'study' ? handleRateVocab : handleRateScript)('good');
        else if (e.key === '4') (view === 'study' ? handleRateVocab : handleRateScript)('easy');
        else if (e.key === 'g' && view === 'study' && card.grammar) setGrammarOpen(g => !g);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, revealed, currentVocab, currentScript, handleShow, handleRateVocab, handleRateScript]);

  // ---------- Update document title with due-card count ----------
  useEffect(() => {
    if (!meta || !vocab.length) return;
    const now = Date.now();
    const due = vocab.filter(c => (meta.activeLangs || LANG_ORDER).includes(c.lang) && c.state !== 'new' && c.due <= now).length;
    document.title = due > 0 ? `(${due}) Polyglot` : 'Polyglot';
  }, [vocab, meta]);

  // ---------- Loading state ----------
  if (!meta) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#0F0E0D' }}>
        <div className="font-display text-[28px] loading-pulse" style={{ color: '#E8DCC4' }}>Polyglot</div>
      </div>
    );
  }

  const activeLangs = meta.activeLangs || LANG_ORDER;
  const now = Date.now();
  const totalDue = vocab.filter(c => activeLangs.includes(c.lang) && c.state !== 'new' && c.due <= now).length;
  const newTodayTotal = Object.entries(meta.newToday || {})
    .filter(([k]) => !k.startsWith('script_'))
    .reduce((a, [, n]) => a + n, 0);
  const newRemaining = Math.max(0, NEW_PER_DAY * activeLangs.length - newTodayTotal);
  const streakDisplay = effectiveStreak(meta);

  return (
    <div className="h-full flex flex-col relative grain max-w-md mx-auto safe-top safe-bottom" style={{ background: '#0F0E0D' }}>
      {flash && <div className="flash-anim absolute inset-0 pointer-events-none z-50" style={{ background: 'radial-gradient(circle at center, rgba(232,220,196,0.15) 0%, transparent 70%)' }} />}

      <header className="relative z-10 pt-3 pb-2 px-5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(232,220,196,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="font-display text-[20px] tracking-tight">Polyglot</span>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-30">A0</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Pill icon="🔥" value={streakDisplay} label="streak" title={`${streakDisplay} Tage am Stück gelernt`} />
          <Pill value={totalDue} label="fällig" title={`${totalDue} Karten zur Wiederholung fällig`} />
          <Pill value={newRemaining} label="neu" title={`${newRemaining} neue Karten heute übrig`} />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col px-5 min-h-0">
        {view === 'study' && (
          <StudyView
            card={currentVocab}
            revealed={revealed}
            onShow={handleShow}
            onRate={handleRateVocab}
            accent={currentVocab ? LANGUAGES[currentVocab.lang].accent : '#E8DCC4'}
            grammarOpen={grammarOpen}
            onToggleGrammar={() => setGrammarOpen(g => !g)}
            newToday={currentVocab ? (meta.newToday?.[currentVocab.lang] || 0) : 0}
            onNavigate={setView}
          />
        )}
        {view === 'script' && (
          <ScriptView
            lang={scriptLang}
            onChooseLang={(l) => { setScriptLang(l); setRevealed(false); }}
            card={currentScript}
            revealed={revealed}
            onShow={handleShow}
            onRate={handleRateScript}
            onBack={() => { setScriptLang(null); setRevealed(false); }}
            scripts={scripts}
            activeLangs={activeLangs}
          />
        )}
        {view === 'stories' && (
          <StoriesView
            stories={stories}
            activeLangs={activeLangs}
            storyLang={storyLang}
            setStoryLang={setStoryLang}
            activeStoryId={activeStoryId}
            setActiveStoryId={setActiveStoryId}
            onGenerate={handleGenerateStory}
            generating={generating}
            genError={genError}
            hasApiKey={hasApiKey}
            onMineWord={mineWord}
            onDeleteStory={handleDeleteStory}
            onComplete={handleCompleteStory}
          />
        )}
        {view === 'chat' && (
          <ChatView
            chats={chats}
            activeLangs={activeLangs}
            chatLang={chatLang}
            setChatLang={setChatLang}
            onStart={startChat}
            onSend={sendChat}
            onReset={resetChat}
            generating={generating}
            genError={genError}
            hasApiKey={hasApiKey}
            onMineWord={mineWord}
          />
        )}
        {view === 'stats' && (
          <StatsView meta={meta} vocab={vocab} scripts={scripts} stories={stories} chats={chats} />
        )}
        {view === 'langs' && (
          <LangsView
            activeLangs={activeLangs}
            onToggle={toggleLang}
            onGenerate={handleGenerateVocab}
            generating={generating}
            genError={genError}
            vocab={vocab}
            scripts={scripts}
            hasApiKey={hasApiKey}
            onKeyChange={refreshApiKey}
            onReset={handleReset}
            onExport={exportJSON}
            onImport={handleImport}
          />
        )}
      </main>

      <nav className="relative z-10 flex justify-around py-3 px-2 border-t" style={{ borderColor: 'rgba(232,220,196,0.06)' }}>
        <TabBtn active={view === 'study'}   onClick={() => setView('study')}   icon={<Brain size={18} />}        label="lernen" />
        <TabBtn active={view === 'script'}  onClick={() => setView('script')}  icon={<Type size={18} />}         label="schrift" />
        <TabBtn active={view === 'stories'} onClick={() => setView('stories')} icon={<BookOpen size={18} />}     label="lesen" />
        <TabBtn active={view === 'chat'}    onClick={() => setView('chat')}    icon={<MessageCircle size={18} />} label="chat" />
        <TabBtn active={view === 'stats'}   onClick={() => setView('stats')}   icon={<BarChart3 size={18} />}    label="stats" />
        <TabBtn active={view === 'langs'}   onClick={() => setView('langs')}   icon={<Languages size={18} />}    label="setup" />
      </nav>
    </div>
  );
}
