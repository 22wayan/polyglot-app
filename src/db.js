import Dexie from 'dexie';
import { SEED, CYRILLIC, HANZI, LANG_ORDER } from './data';
import { todayKey, yesterdayKey } from './fsrs';

export const db = new Dexie('polyglot');

db.version(1).stores({
  vocab:        'id, lang, state, due, order',
  scripts:      'id, lang, state, due, order',
  stories:      'id, lang, createdAt',
  chatMessages: '++localId, lang, ts',
  meta:         'key',
});

// Seed on first run
db.on('populate', async (tx) => {
  await tx.table('vocab').bulkAdd(buildVocab());
  await tx.table('scripts').bulkAdd(buildScripts());
  await tx.table('meta').put({
    key: 'global',
    streak: 0,
    lastStudyDate: null,
    totalReviewed: 0,
    todayReviewed: 0,
    todayDate: todayKey(),
    activeLangs: LANG_ORDER,
    newToday: {},
    apiKey: '',
  });
});

function buildVocab() {
  return SEED.map((row, i) => ({
    id: `v_${i}`, kind: 'vocab', lang: row[0], type: row[1],
    de: row[2], target: row[3], pronunciation: row[4], grammar: row[5], order: row[6],
    stability: 0, difficulty: 0, state: 'new', reps: 0, lapses: 0, due: 0, lastReview: null,
    stats: { again: 0, hard: 0, good: 0, easy: 0 },
  }));
}

function buildScripts() {
  const cyr = CYRILLIC.map((row, i) => ({
    id: `s_ru_${i}`, kind: 'script', lang: 'ru',
    char: row[0], romanization: row[1], hint: row[2], example: row[3], example_meaning: row[4],
    order: i + 1,
    stability: 0, difficulty: 0, state: 'new', reps: 0, lapses: 0, due: 0, lastReview: null,
    stats: { again: 0, hard: 0, good: 0, easy: 0 },
  }));
  const han = HANZI.map((row, i) => ({
    id: `s_zh_${i}`, kind: 'script', lang: 'zh',
    char: row[0], romanization: row[1], hint: row[2], example: row[3], example_meaning: row[4],
    order: i + 1,
    stability: 0, difficulty: 0, state: 'new', reps: 0, lapses: 0, due: 0, lastReview: null,
    stats: { again: 0, hard: 0, good: 0, easy: 0 },
  }));
  return [...cyr, ...han];
}

// ============================================================
//  Helpers
// ============================================================

export async function getMeta() {
  return (await db.meta.get('global')) || {};
}
export async function updateMeta(patch) {
  const cur = await getMeta();
  await db.meta.put({ ...cur, ...patch, key: 'global' });
}

// Apply daily rollover to a meta object (in-memory, caller persists).
function rolloverIfNeeded(cur, t) {
  if (cur.todayDate !== t) {
    return { ...cur, todayDate: t, todayReviewed: 0, newToday: {} };
  }
  return cur;
}

// Bump streak inside an existing transaction (or standalone).
function bumpStreakInPlace(cur, t) {
  if (cur.todayDate !== t) {
    const yest = yesterdayKey();
    const newStreak = cur.lastStudyDate === yest ? (cur.streak || 0) + 1 : 1;
    return {
      ...cur,
      todayDate: t,
      todayReviewed: 1,
      newToday: {},
      streak: newStreak,
      lastStudyDate: t,
      totalReviewed: (cur.totalReviewed || 0) + 1,
    };
  }
  return {
    ...cur,
    todayReviewed: (cur.todayReviewed || 0) + 1,
    totalReviewed: (cur.totalReviewed || 0) + 1,
    lastStudyDate: t,
  };
}

export async function bumpStreak() {
  const t = todayKey();
  await db.transaction('rw', db.meta, async () => {
    const cur = await getMeta();
    const next = bumpStreakInPlace(cur, t);
    await db.meta.put({ ...next, key: 'global' });
  });
}

export async function maybeRolloverDay() {
  const t = todayKey();
  await db.transaction('rw', db.meta, async () => {
    const cur = await getMeta();
    const next = rolloverIfNeeded(cur, t);
    if (next !== cur) await db.meta.put({ ...next, key: 'global' });
  });
}

// Atomically: write the FSRS-updated card, bump newToday for new cards,
// and update streak/totals. Avoids races when the user rates rapidly.
export async function commitReview(table, updatedCard, wasNew, newCounterKey) {
  const t = todayKey();
  await db.transaction('rw', table, db.meta, async () => {
    await table.put(updatedCard);
    const cur = await getMeta();
    let next = bumpStreakInPlace(cur, t);
    if (wasNew) {
      const newToday = { ...(next.newToday || {}) };
      newToday[newCounterKey] = (newToday[newCounterKey] || 0) + 1;
      next = { ...next, newToday };
    }
    await db.meta.put({ ...next, key: 'global' });
  });
}

export async function mineWord(lang, word, translation, pronunciation = '') {
  const existing = await db.vocab.where({ lang }).filter(c => c.target.trim() === word.trim()).first();
  if (existing) return false;
  await db.vocab.add({
    id: `mined_${lang}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind: 'vocab', lang, type: 'vocab',
    de: translation, target: word, pronunciation, grammar: '', order: 9999,
    stability: 0, difficulty: 0, state: 'new', reps: 0, lapses: 0, due: 0, lastReview: null,
    stats: { again: 0, hard: 0, good: 0, easy: 0 },
  });
  return true;
}

export async function resetAll() {
  await db.delete();
  await db.open();
}

export async function exportJSON() {
  const data = {
    version: 1,
    exportedAt: Date.now(),
    vocab: await db.vocab.toArray(),
    scripts: await db.scripts.toArray(),
    stories: await db.stories.toArray(),
    chatMessages: await db.chatMessages.toArray(),
    meta: await db.meta.toArray(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `polyglot-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJSON(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (data.version !== 1) throw new Error('Unbekannte Backup-Version');
  await db.transaction('rw', db.vocab, db.scripts, db.stories, db.chatMessages, db.meta, async () => {
    await Promise.all([db.vocab.clear(), db.scripts.clear(), db.stories.clear(), db.chatMessages.clear(), db.meta.clear()]);
    if (data.vocab) await db.vocab.bulkAdd(data.vocab);
    if (data.scripts) await db.scripts.bulkAdd(data.scripts);
    if (data.stories) await db.stories.bulkAdd(data.stories);
    if (data.chatMessages) {
      // strip localId so dexie re-assigns
      await db.chatMessages.bulkAdd(data.chatMessages.map((m) => {
        const { localId: _drop, ...rest } = m;
        return rest;
      }));
    }
    if (data.meta) await db.meta.bulkAdd(data.meta);
  });
}
