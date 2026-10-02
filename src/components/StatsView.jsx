import React from 'react';
import { LANGUAGES, LANG_ORDER } from '../data';
import { effectiveStreak } from '../fsrs';

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
          // Begonnen = mindestens 1× geratet (bewegt sich beim ersten Klick).
          // Gemeistert = mindestens 2× durch und stabil im Review-State.
          const v_begun = vc.filter(c => c.state !== 'new').length;
          const v_mastered = vc.filter(c => c.reps >= 2 && c.state === 'review').length;
          const v_due = vc.filter(c => c.state !== 'new' && c.due <= now).length;
          const v_new = vc.filter(c => c.state === 'new').length;
          const s_total = sc.length;
          const s_begun = sc.filter(c => c.state !== 'new').length;
          const s_mastered = sc.filter(c => c.reps >= 2 && c.state === 'review').length;
          const pct = v_total ? Math.round((v_begun / v_total) * 100) : 0;
          const sPct = s_total ? Math.round((s_begun / s_total) * 100) : 0;
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
                <span>vokabeln {v_begun}/{v_total} · {v_mastered} fest</span>
                <span>{v_due} fällig · {v_new} neu</span>
              </div>
              {hasScript && (
                <>
                  <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(232,220,196,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${sPct}%`, background: L.accent, opacity: 0.5 }} />
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider opacity-50 mb-2">schrift {s_begun}/{s_total} · {s_mastered} fest ({sPct}%)</div>
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
