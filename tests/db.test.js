import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, getMeta, commitReview, mineWord, importJSON, resetAll } from '../src/db';
import { todayKey } from '../src/fsrs';

beforeEach(async () => {
  await resetAll();
});

describe('db seed', () => {
  it('seeds vocab, scripts and meta on first open', async () => {
    expect(await db.vocab.count()).toBeGreaterThan(0);
    expect(await db.scripts.where({ lang: 'ru' }).count()).toBeGreaterThan(0);
    const meta = await getMeta();
    expect(meta.streak).toBe(0);
    expect(meta.activeLangs.length).toBe(5);
  });
});

describe('commitReview', () => {
  it('writes the card, counts the new card and starts a streak', async () => {
    const card = await db.vocab.toCollection().first();
    await commitReview(db.vocab, { ...card, reps: 1, state: 'learning' }, true, card.lang);

    expect((await db.vocab.get(card.id)).reps).toBe(1);
    const meta = await getMeta();
    expect(meta.streak).toBe(1);
    expect(meta.lastStudyDate).toBe(todayKey());
    expect(meta.todayReviewed).toBe(1);
    expect(meta.newToday[card.lang]).toBe(1);
  });

  it('does not grow the streak twice on the same day', async () => {
    const card = await db.vocab.toCollection().first();
    await commitReview(db.vocab, card, false, card.lang);
    await commitReview(db.vocab, card, false, card.lang);
    const meta = await getMeta();
    expect(meta.streak).toBe(1);
    expect(meta.todayReviewed).toBe(2);
  });
});

describe('mineWord', () => {
  it('adds a word once and ignores duplicates', async () => {
    expect(await mineWord('es', 'gato', 'Katze')).toBe(true);
    expect(await mineWord('es', ' gato ', 'Katze')).toBe(false);
    expect(await db.vocab.where({ lang: 'es' }).filter(c => c.target === 'gato').count()).toBe(1);
  });
});

describe('importJSON', () => {
  it('rejects unknown backup versions', async () => {
    const file = { text: async () => JSON.stringify({ version: 2 }) };
    await expect(importJSON(file)).rejects.toThrow();
  });

  it('replaces all tables with the backup', async () => {
    const file = {
      text: async () => JSON.stringify({
        version: 1,
        vocab: [{ id: 'v_x', lang: 'fr', state: 'new', due: 0, order: 1, target: 'chat', de: 'Katze' }],
        meta: [{ key: 'global', streak: 7 }],
      }),
    };
    await importJSON(file);
    expect(await db.vocab.count()).toBe(1);
    expect(await db.scripts.count()).toBe(0);
    expect((await getMeta()).streak).toBe(7);
  });
});
