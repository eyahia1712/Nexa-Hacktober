# Nexa (ASEAN demo)

**One door to every startup opportunity in ASEAN.**
Upload a pitch deck. Gemma 4 reads it, fixed rules match it against grants, programmes, investors and partners across the ten ASEAN countries, and every match shows ✅ / ⚠️ / ❌ with the reason.

Practice demo for Hacktoberfest Hack Day KL 2026 (Startup ASEAN, Problem Statement 2: Ecosystem Gateway).

## Run it

```bash
npm install
# add your key to .env.local:  GEMINI_API_KEY=...
npm run dev
```

Open http://localhost:3000. Without a key the app runs in sample mode.

## What Gemma 4 does

| Feature | Route | Gemma 4 input |
| --- | --- | --- |
| Pitch deck → startup profile | `/api/profile` | PDF / slide images (multimodal) |
| Ask Nexa, in any ASEAN language | `/api/ask` | Question + profile + matched list |
| One-click intro email | `/api/draft` | Profile + opportunity |
| Poster / post → new opportunity | `/api/poster` | Image or pasted text |

Model: `gemma-4-26b-a4b-it` (change with `GEMMA_MODEL`), called through the Gemini API with minimal thinking for speed.

## What decides a match

`lib/match.ts`: plain rules, never the AI. These rules can block a match (❌): deadline passed, wrong stage, or not open to your country. The score adds points for sector fit, offers that match your needs, and target markets.

## Files

- `app/page.tsx`: landing page
- `components/Workspace.tsx`: upload → matches → Ask Nexa → tracker
- `lib/opportunities.ts`: 29 demo opportunities (real organisation names; amounts and deadlines are illustrative)
- `lib/gemma.ts`: Gemma 4 calls and output cleaning
