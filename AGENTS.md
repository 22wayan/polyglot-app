# AGENTS.md

Guide for coding agents working on this repository. Users find setup and features in `README.md`.

## What this is

A local-first language learning PWA (React 18, Vite, Tailwind, Dexie). All learning data lives in the browser's IndexedDB. Users enter their own Anthropic key in the Setup tab; the browser then calls the Anthropic API directly. `api/generate.js` is an optional Vercel proxy for self-hosting with one server-side key.

## Commands

```bash
npm install
npm run dev      # app on http://localhost:5173, AI tabs locked without a key
npm test         # Vitest, runs in Node with fake-indexeddb
npm run lint     # ESLint 9, React and hooks rules
npm run build    # production build into dist/
```

`npm run lint`, `npm test` and `npm run build` must pass before you finish. Do not run a build while the dev server is running.

## Code map

| Path | Responsibility |
|---|---|
| `src/App.jsx` | State, navigation and all callbacks; views receive data and handlers as props |
| `src/components/` | One file per tab (`StudyView`, `ScriptView`, `StoriesView`, `ChatView`, `StatsView`, `LangsView`) plus shared UI in `ui.jsx` |
| `src/components.jsx` | Re-exports, so `App.jsx` imports from one place |
| `src/fsrs.js` | FSRS-4 scheduler and streak logic, pure functions |
| `src/db.js` | Dexie schema, seed on first run, atomic review commits, backup export and import |
| `src/data.js` | Languages, seed vocabulary, Cyrillic and Hanzi decks, daily limits |
| `src/ai.js` | Prompts, API calls, speech synthesis and recognition |
| `src/aiParse.js` | Parsing and validation of model answers, no browser APIs |
| `src/apiKey.js` | The user's own key: read, store, mask, format check |
| `src/aiRequest.js` | Messages API body and headers, shared by the browser path and the proxy |
| `src/components/ApiKeyCard.jsx` | Setup card to enter, verify and remove the key |
| `api/generate.js` | Proxy: origin allowlist, optional app token, per-IP rate limit, model allowlist, size caps |
| `tests/` | Vitest suites for `fsrs.js`, `aiParse.js`, `db.js`, `apiKey.js`, the direct API path in `ai.js` and `api/generate.js`; UI is tested by hand in the browser |

## Rules for changes

- **Validate model output at the boundary.** Every model answer goes through `aiParse.js` before it reaches state or IndexedDB. Add a test for each new field.
- **Never ship a key.** The user's own key lives only in `localStorage` (`src/apiKey.js`) and goes only to `api.anthropic.com`. Nothing in `src/` may read `ANTHROPIC_API_KEY`; variables with the `VITE_` prefix end up in the public bundle.
- **Never log, export or send the user's key elsewhere.** Backups (`exportJSON`) cover IndexedDB only, keep it that way.
- **Proxy limits stay.** Do not widen the origin allowlist, the model allowlist or the size caps in `api/generate.js` without a test for the new case.
- **Schema changes need a Dexie version bump** in `db.js` and an upgrade path; users keep their progress across releases.
- **Hooks before early returns.** ESLint enforces the rules of hooks; do not disable them.
- **The app must work without a key.** AI features show `LockedAI`; flashcards, scripts and stats keep working.
- **No real secrets or personal data** in code, tests or fixtures.

## Conventions

- Functional components with hooks, Tailwind classes, no CSS modules.
- The UI and the prompts are in German; code, comments and docs are in English.
- Pure logic goes into plain modules with tests; components stay thin.
- Return new objects instead of mutating state or cards.
