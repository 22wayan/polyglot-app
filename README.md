# Polyglot

5-Sprachen-Lern-App (FR/ZH/RU/ID/ES) mit FSRS, Schrift-Trainer und KI-Tutor.
Lokal-first auf IndexedDB, deployed auf Vercel als PWA.

---

## Schnellstart

### 1. Tools installieren (einmalig)

```bash
# Falls Homebrew fehlt:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node                           # Node.js v22+
npm install -g @anthropic-ai/claude-code    # Claude Code CLI
npm install -g vercel                       # Vercel CLI
```

### 2. Projekt aufsetzen

```bash
cd polyglot-app
npm install
npm run dev          # → http://localhost:5173
```

### 3. Auf GitHub pushen

```bash
git init
git add .
git commit -m "Polyglot v4.0 — initial"
# Repo bei github.com/new anlegen (Name: polyglot-app)
git remote add origin git@github.com:DEINUSER/polyglot-app.git
git branch -M main
git push -u origin main
```

### 4. Auf Vercel deployen

```bash
vercel login
vercel link          # Projekt mit Vercel verknüpfen
vercel deploy --prod # erstes Production-Deployment
```

Die URL sieht aus wie `https://polyglot-app-xxx.vercel.app`. Custom-Domain (`polyglot.dein-name.de`) kannst du später im Vercel-Dashboard hinzufügen.

### 5. Auf iPhone "installieren"

1. URL in Safari öffnen (nicht Chrome — Chrome supportet PWAs auf iOS schlechter)
2. Teilen-Button → **„Zum Home-Bildschirm"**
3. Bestätigen
4. Icon erscheint auf Home-Screen — neben Insta. App startet vollscreen ohne Browser-UI.

---

## KI-Features aktivieren (später, wenn du den Key hast)

Ohne API-Key sind **Lesen**, **Chat** und **+8-Karten-Generator** gesperrt (Schloss-Symbol). Lokales Lernen läuft normal.

Wenn du den Key besorgt hast (`console.anthropic.com` → API Keys → Create Key):

```bash
vercel env add ANTHROPIC_API_KEY
# > Paste den Key (sk-ant-...)
# > Wähle "Production, Preview, Development"

vercel deploy --prod
```

Nach ~30 Sekunden sind die KI-Features unlocked. App neu öffnen, fertig.

---

## Mit Claude Code weiterarbeiten

```bash
cd polyglot-app
claude
```

Damit hast du Claude direkt im Terminal mit Zugriff auf alle Files. Beispiele was du fragen könntest:

- „Füg noch 20 italienische Vokabeln zum Seed hinzu"
- „Refactor App.jsx — split die Handlers in einen eigenen Hook"
- „Build mir einen Pomodoro-Timer für Lern-Sessions ein"
- „Wie ändere ich die Akzentfarbe für ZH?"

---

## Versionierung

- `main` Branch = Production
- Feature-Branches für größere Sachen: `feat/sync`, `feat/push-notifs`
- Tags für Releases: `v4.0.0`, `v4.0.1`, `v4.1.0`...

```bash
git tag v4.0.0
git push --tags
```

---

## v4.1 Roadmap (in 1-2 Wochen)

Was als nächstes drankommt — bündelt sich gut weil alles ein Backend braucht:

- **Supabase** (Postgres + Auth, Free-Tier reicht jahrelang)
- **Multi-Device-Sync** (auf iPad und Laptop weiterlernen)
- **Web Push für fällige Karten** (Vercel Cron triggert täglich um 19h)
- **Login-Screen** (E-Mail-Magic-Link)

Wenn v4.0 stabil läuft und du es 1-2 Wochen genutzt hast, machen wir das Upgrade.

---

## Troubleshooting

**`npm install` failt:** Node-Version checken (`node -v` → mindestens v20). Bei Proxy-Errors: `npm config delete proxy`.

**PWA installiert sich nicht auf iPhone:** Du musst Safari nehmen, nicht Chrome. Außerdem muss `https://` sein (lokal mit `npm run dev` geht's nicht — erst auf Vercel deployen).

**Spracherkennung geht nicht:** Browser-Mikrofon-Permission checken. Funktioniert in Safari iOS und Chrome am besten.

**Daten weg nach iOS-Update:** iOS löscht IndexedDB von PWAs gelegentlich (Apple-Bug, bekannt). Daher: regelmäßig im Setup-Tab → Backup → Export. Das sollte mit v4.1 + Sync gefixt sein.

---

## Stack

- **Frontend:** React 18 + Vite 6 + Tailwind CSS
- **Storage:** IndexedDB via Dexie.js
- **PWA:** vite-plugin-pwa (Workbox)
- **API-Proxy:** Vercel Serverless Function (`api/generate.js`)
- **AI:** Claude Sonnet 4 via Anthropic API
- **Algorithmus:** FSRS-4 (Open-Source-Lizenz)
