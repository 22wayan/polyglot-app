import { describe, it, expect } from 'vitest';
import { extractJSON, sanitizeChatReply, trimOrNull } from '../src/aiParse';

describe('extractJSON', () => {
  it('parses plain JSON', () => {
    expect(extractJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown code fences', () => {
    expect(extractJSON('```json\n[1,2]\n```')).toEqual([1, 2]);
  });

  it('finds JSON embedded in prose', () => {
    expect(extractJSON('Here you go: {"word":"hola"} hope it helps')).toEqual({ word: 'hola' });
  });

  it('ignores brackets inside strings', () => {
    expect(extractJSON('Sure! {"text":"a } b [c"} done')).toEqual({ text: 'a } b [c' });
  });

  it('takes whichever JSON value starts first', () => {
    expect(extractJSON('list: [{"x":1}] and {"y":2}')).toEqual([{ x: 1 }]);
  });

  it('throws when there is no JSON', () => {
    expect(() => extractJSON('no json here')).toThrow();
  });
});

describe('sanitizeChatReply', () => {
  it('trims fields and turns empty corrections into null', () => {
    const out = sanitizeChatReply({
      reply: '  Bonjour  ',
      replyTranslation: ' Hallo ',
      correction: '   ',
      correctionExplanation: '',
    });
    expect(out).toEqual({
      reply: 'Bonjour',
      replyTranslation: 'Hallo',
      pronunciation: '',
      correction: null,
      correctionExplanation: null,
      newWords: [],
    });
  });

  it('drops incomplete new words', () => {
    const out = sanitizeChatReply({
      reply: 'ok',
      newWords: [
        { word: 'gato', translation: 'Katze' },
        { word: '', translation: 'leer' },
        { word: 'perro' },
        null,
      ],
    });
    expect(out.newWords).toEqual([{ word: 'gato', translation: 'Katze', pronunciation: '' }]);
  });

  it('rejects an empty reply', () => {
    expect(() => sanitizeChatReply({ reply: '  ' })).toThrow();
    expect(() => sanitizeChatReply(undefined)).toThrow();
  });
});

describe('trimOrNull', () => {
  it('returns null for non-strings', () => {
    expect(trimOrNull(42)).toBeNull();
  });
});
