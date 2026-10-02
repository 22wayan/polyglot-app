# Polyglot

[![ci](https://github.com/22wayan/polyglot-app/actions/workflows/ci.yml/badge.svg)](https://github.com/22wayan/polyglot-app/actions/workflows/ci.yml)

A language learning app for five languages at once: French, Spanish, Indonesian, Russian and Chinese. It combines spaced-repetition flashcards with a script trainer and an AI conversation tutor, and installs on a phone as a progressive web app.

I built it because I learn these five languages in parallel and no app handled that well.

## Features

- **Spaced repetition with FSRS-4.** Each card is scheduled by the open-source FSRS algorithm, the same family of models Anki uses.
- **Script trainer** for Cyrillic and Chinese characters, with pinyin and transliteration.
- **AI tutor.** You chat in the target language; the tutor answers, corrects your sentence, explains the correction and suggests new words you can add as cards with one tap.
- **AI card generation.** New cards on request, without duplicates of what you already know.
- **Beginner stories.** Short AI-written stories (A0 level) with a translation for every sentence and key words you can add as cards.
- **Local-first.** All progress lives in IndexedDB on the device, with export and import as backup.

The interface is in German, and cards go from German to the target language. Five languages are active by default; switch them in the Setup tab.

## Architecture

- **Frontend:** React 18, Vite, Tailwind CSS, Dexie.js for IndexedDB, vite-plugin-pwa
- **AI:** Claude Sonnet for the tutor, Claude Haiku for cheap card generation, with prompt caching for the tutor's system prompt
- **API proxy:** a Vercel serverless function (`api/generate.js`). The Anthropic key only exists on the server, never in the browser. The proxy checks the origin, limits requests per IP and can require an app token.
- **Robustness:** model answers are validated and normalised at the boundary, so empty or malformed fields never reach the UI.

## Run it yourself

Requires Node 20 or newer.

```bash
npm install
npm run dev                      # http://localhost:5173
```

Without an API key the app works as a plain flashcard and script trainer; the AI tabs show a lock screen.

### Enable the AI features

The browser never sees the Anthropic key. It calls `/api/generate`, a Vercel function that adds the key on the server.

1. Deploy to Vercel (`npx vercel`).
2. Set `ANTHROPIC_API_KEY` in the Vercel project settings, see `.env.example`.
3. Optional: set `VITE_APP_TOKEN` on both sides to reject requests without the token.
4. Set a monthly spend limit in the Anthropic console. The proxy limits each IP to 12 requests per minute and caps prompts and tokens, but a public URL can still be found.

For local AI testing run `npx vercel dev` instead of `npm run dev`, so the function runs too.

## Development

```bash
npm test          # Vitest: scheduler, model-output parsing, API proxy, IndexedDB layer
npm run lint      # ESLint with React and hooks rules
npm run build     # production build into dist/
```

CI runs lint, tests, build and a secret scan on every push. `AGENTS.md` explains the code layout and rules for coding agents.

```
api/generate.js        Vercel function, Anthropic proxy with origin check and rate limit
src/fsrs.js            FSRS-4 scheduler, pure functions
src/aiParse.js         parsing and validation of model answers
src/ai.js              prompts and API calls
src/db.js              Dexie schema, seed data, backup export and import
src/components/        one file per tab plus shared UI
tests/                 Vitest suites
```

## Known limitation

Speech recognition is disabled in the iOS home-screen app, because WebKit does not support it there reliably.

## License

MIT
