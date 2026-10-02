import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyFSRS, effectiveStreak, todayKey, yesterdayKey, DAY } from '../src/fsrs';

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

function newCard() {
  return { id: 'c1', state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0, due: 0, lastReview: null };
}

describe('applyFSRS', () => {
  it('schedules a new card rated good at least one day ahead', () => {
    const card = applyFSRS(newCard(), 'good', NOW);
    expect(card.state).toBe('learning');
    expect(card.reps).toBe(1);
    expect(card.lastReview).toBe(NOW);
    expect(card.due).toBeGreaterThanOrEqual(NOW + DAY);
    expect(card.stats.good).toBe(1);
  });

  it('shows a new card rated again within minutes and does not count a lapse', () => {
    const card = applyFSRS(newCard(), 'again', NOW);
    expect(card.state).toBe('relearning');
    expect(card.due - NOW).toBeLessThan(DAY / 24);
    expect(card.lapses).toBe(0);
  });

  it('gives easy a longer first interval than hard', () => {
    const hard = applyFSRS(newCard(), 'hard', NOW);
    const easy = applyFSRS(newCard(), 'easy', NOW);
    expect(easy.due).toBeGreaterThan(hard.due);
    expect(easy.difficulty).toBeLessThan(hard.difficulty);
  });

  it('grows stability on a successful review and counts a lapse on failure', () => {
    const learned = applyFSRS(newCard(), 'good', NOW);
    const later = learned.due;
    const passed = applyFSRS(learned, 'good', later);
    expect(passed.state).toBe('review');
    expect(passed.stability).toBeGreaterThan(learned.stability);

    const failed = applyFSRS(learned, 'again', later);
    expect(failed.state).toBe('relearning');
    expect(failed.lapses).toBe(1);
    expect(failed.stability).toBeLessThan(learned.stability);
  });

  it('keeps difficulty inside 1..10 and leaves the input card untouched', () => {
    let card = newCard();
    const snapshot = { ...card };
    for (let i = 0; i < 20; i++) card = applyFSRS(card, 'again', NOW + i * DAY);
    expect(card.difficulty).toBeGreaterThanOrEqual(1);
    expect(card.difficulty).toBeLessThanOrEqual(10);
    expect(newCard()).toEqual(snapshot);
  });
});

describe('effectiveStreak', () => {
  afterEach(() => vi.useRealTimers());

  it('is zero without a study date', () => {
    expect(effectiveStreak(null)).toBe(0);
    expect(effectiveStreak({ streak: 5, lastStudyDate: null })).toBe(0);
  });

  it('keeps the streak when the last review was today or yesterday', () => {
    expect(effectiveStreak({ streak: 4, lastStudyDate: todayKey() })).toBe(4);
    expect(effectiveStreak({ streak: 4, lastStudyDate: yesterdayKey() })).toBe(4);
  });

  it('breaks the streak after a missed day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 9, 0, 0));
    expect(effectiveStreak({ streak: 9, lastStudyDate: '2026-01-13' })).toBe(0);
  });
});
