# Polyglot

A language learning app for five languages at once: French, Spanish, Indonesian, Russian and Chinese. It combines spaced-repetition flashcards with a script trainer and an AI conversation tutor, and installs on a phone as a progressive web app.

I built it because I learn these five languages in parallel and no app handled that well.

## Features

- **Spaced repetition with FSRS-4.** Each card is scheduled by the open-source FSRS algorithm, the same family of models Anki uses.
- **Script trainer** for Cyrillic and Chinese characters, with pinyin and transliteration.
- **AI tutor.** You chat in the target language; the tutor answers, corrects your sentence, explains the correction and suggests new words you can add as cards with one tap.
- **AI card generation.** New cards for a topic, without duplicates of what you already know.
- **Local-first.** All progress lives in IndexedDB on the device, with export and import as backup.

## Architecture

- **Frontend:** React 18, Vite, Tailwind CSS, Dexie.js for IndexedDB, vite-plugin-pwa
- **AI:** Claude Sonnet for the tutor, Claude Haiku for cheap card generation, with prompt caching for the tutor's system prompt
- **API proxy:** a Vercel serverless function (`api/generate.js`). The Anthropic key only exists on the server, never in the browser. The proxy checks the origin, limits requests per IP and can require an app token.
- **Robustness:** model answers are validated and normalised at the boundary, so empty or malformed fields never reach the UI.

## Run it yourself

```bash
npm install
npm run dev                      # http://localhost:5173
```

For the AI features, deploy to Vercel and set `ANTHROPIC_API_KEY` as an environment variable. Without a key the app works as a plain flashcard trainer.

## Known limitation

Speech recognition is disabled in the iOS home-screen app, because WebKit does not support it there reliably.

## License

MIT
