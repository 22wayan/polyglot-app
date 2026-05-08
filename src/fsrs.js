// FSRS-4 weights (open source, MIT)
const W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];
export const DAY = 86_400_000;
const REQUEST_RETENTION = 0.9;
const FACTOR = 19 / 81;
const DECAY = -0.5;

function ratingValue(r) { return { again: 1, hard: 2, good: 3, easy: 4 }[r]; }
function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }
function initStability(r) { return Math.max(W[r - 1], 0.1); }
function initDifficulty(r) { return clamp(W[4] - (r - 3) * W[5], 1, 10); }
function retrievability(elapsedDays, S) { return Math.pow(1 + FACTOR * elapsedDays / S, DECAY); }
function nextDifficulty(D, r) {
  const newD = D - W[6] * (r - 3);
  return clamp(W[7] * 4.93 + (1 - W[7]) * newD, 1, 10);
}
function nextStabilitySuccess(D, S, R, r) {
  const hardPenalty = r === 2 ? W[15] : 1;
  const easyBonus = r === 4 ? W[16] : 1;
  return S * (1 + Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp((1 - R) * W[10]) - 1) * hardPenalty * easyBonus);
}
function nextStabilityFail(D, S, R) {
  return W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp((1 - R) * W[14]);
}
function nextInterval(S) {
  const days = S / FACTOR * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(days));
}

export function applyFSRS(card, rating, now = Date.now()) {
  const r = ratingValue(rating);
  const isNew = card.state === 'new' || !card.stability;
  let stability, difficulty, interval;
  if (isNew) {
    stability = initStability(r);
    difficulty = initDifficulty(r);
    interval = rating === 'again' ? 1 / 1440 : nextInterval(stability);
  } else {
    const elapsed = card.lastReview ? (now - card.lastReview) / DAY : 0;
    const R = retrievability(elapsed, card.stability);
    difficulty = nextDifficulty(card.difficulty, r);
    if (rating === 'again') {
      stability = nextStabilityFail(card.difficulty, card.stability, R);
      interval = 1 / 1440;
    } else {
      stability = nextStabilitySuccess(card.difficulty, card.stability, R, r);
      interval = nextInterval(stability);
    }
  }
  const due = now + interval * DAY;
  const newState = rating === 'again' ? 'relearning' : (isNew ? 'learning' : 'review');
  const lapses = (card.lapses || 0) + (rating === 'again' && !isNew ? 1 : 0);
  const stats = { ...(card.stats || {}), [rating]: (card.stats?.[rating] || 0) + 1 };
  return { ...card, stability, difficulty, state: newState, reps: (card.reps || 0) + 1, lapses, due, lastReview: now, stats };
}

export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
