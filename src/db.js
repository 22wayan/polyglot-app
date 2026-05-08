import Dexie from 'dexie';
import { SEED, CYRILLIC, HANZI, LANG_ORDER } from './data';
import { todayKey } from './fsrs';

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
    apiKey: '',  // user can paste later in settings
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

export async function bumpStreak() {
  const cur = await getMeta();
  const t = todayKey();
  if (cur.todayDate !== t) {
    const yest = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; })();
    const newStreak = cur.lastStudyDate === yest ? (cur.streak || 0) + 1 : 1;
    await updateMeta({
      todayDate: t, todayReviewed: 1, streak: newStreak, lastStudyDate: t,
      totalReviewed: (cur.totalReviewed || 0) + 1, newToday: {},
    });
  } else {
    await updateMeta({
      todayReviewed: (cur.todayReviewed || 0) + 1,
      totalReviewed: (cur.totalReviewed || 0) + 1,
      lastStudyDate: t,
    });
  }
}

export async function maybeRolloverDay() {
  const cur = await getMeta();
  if (cur.todayDate !== todayKey()) {
    await updateMeta({ todayDate: todayKey(), todayReviewed: 0, newToday: {} });
  }
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
  // Re-create
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
      await db.chatMessages.bulkAdd(data.chatMessages.map(({ localId, ...rest }) => rest));
    }
    if (data.meta) await db.meta.bulkAdd(data.meta);
  });
}
