# Malay Mouse 🧀 (Next.js 14)

Fun, highly interactive Malay (Bahasa Malaysia) learning app with flashcards, quizzes, and a snake-style game (mouse eats cheese). Each cheese triggers a voice-over of a Malay word so kids can practice pronunciation.

## Quick start

```bash
# 1) Install deps
pnpm i # or npm i / yarn

# 2) Run dev
pnpm dev # or npm run dev / yarn dev

# 3) Open
http://localhost:3000
```

## Deploy to Netlify

1. Push this folder to GitHub.
2. On Netlify, **New site from Git**, pick the repo.
3. Build command: `next build`
4. Publish directory: `.next` (Netlify detects Next.js automatically).

> Tip: Enable the **Next.js runtime** on Netlify if prompted.

## Features

- Random “New 20” words per session
- Flashcards with flip + voice
- Multiple-choice quizzes
- **Mouse & Cheese** game (Arrow keys, space to pause)
- Local progress tracking (localStorage)
- Add your own words in the Word Bank
- Voice with Web Speech API (tries Malay voice, falls back to Indonesian/any)

## Notes

- Works client-side only; no backend needed.
- Progress and word bank save to the browser (device-specific).
- You can style via Tailwind in `app/globals.css`.
# malay-learning-kids-app
