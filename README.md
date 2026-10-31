# Nexa

**Eleven countries. One door.**
Nexa reads a company once, then finds the grants, investors, programmes and partners across all 11 ASEAN countries that it actually qualifies for, with a step-by-step pathway to each one. Works in 12 languages.

Built at Hacktoberfest KL 2026 for the Startup ASEAN challenge (Problem 2: Ecosystem Gateway), entered for Best Use of Gemma 4.

## Run it

```bash
npm install
# create .env.local with:  GEMINI_API_KEY=your-key
npm run dev
```

Open http://localhost:3000. Without a key, the app still runs and uses sample answers.

## The flow

1. **Landing page** (`/`): problem, who it's for, how it works, evidence, FAQ. The language menu sits at the top.
2. **Account** (`/login`): create an account or sign in. Judges can open the **KrackedDevs sample** with no account.
3. **Company profile** (`/start`): three ways in.
   - Sample profile: KrackedDevs
   - Upload company details: PDF, PPTX, DOCX, image or text. Gemma 4 builds the profile.
   - Fill in a form, including a logo upload.
4. **Dashboard** (`/dashboard`): the company card sits on the left. The tabs are:
   - **Overview**: say what you need, or upload a pitch, then see matches and KPIs.
   - **Opportunities**: opportunity cards.
   - **My pathway**: step-by-step plan by Gemma 4, written in your language.
   - **Tracker**: from saved to deal.
   - **Ask Nexa**: chat.

## What Gemma 4 does

| Feature | Route | Input |
| --- | --- | --- |
| Company deck / profile → profile | `/api/profile` | PDF and images directly; PPTX and DOCX text pulled out in memory |
| Pitch → what you need | `/api/need` | Same file types, plus a note |
| Pathway to one opportunity | `/api/pathway` | Profile + needs + match, in the chosen language |
| Ask Nexa | `/api/ask` | Question + matched list; answers in the language you write in |
| Intro email | `/api/draft` | Profile + opportunity, in the chosen language |
| UI translation (build time) | `scripts/translate.mjs` | `messages/en.json` → 11 other languages |

Model: `gemma-4-26b-a4b-it` (change it with `GEMMA_MODEL`), called through the Gemini API.

## Languages

English, Bahasa Melayu, Bahasa Indonesia, 中文, தமிழ், ไทย, Tiếng Việt, Filipino, ខ្មែរ, ລາວ, မြန်မာ, Tetun.
Add or change English text in `messages/en.json`, then run:

```bash
node --env-file=.env.local scripts/translate.mjs
```

It only translates keys that are missing.

## What decides a match

The rules live in `lib/match.ts`. They decide every match; the AI never does.

- **A match is blocked if:** the deadline has passed, the stage is wrong, or the opportunity isn't open to your country.
- **The score adds points for:** sector fit, offers that match your needs, and your target markets.

Every card lists its reasons.

## Notes

- Accounts and profiles are kept in the browser (localStorage) for the demo. Passwords are hashed with SHA-256.
- `lib/opportunities.ts` holds 33 opportunities across all 11 countries. Organisation names are real; amounts and deadlines are illustrative.
- The KrackedDevs sample is built from public facts on krackeddevs.com, read on 31 Oct 2026. Its stage and needs are our assumptions.

## Events, people and talent (POC walkthrough)

**Live demo event:** *Hacktoberfest Hack Day Kuala Lumpur* (Sat 31 Oct 2026, DOJO KL) is seeded with founders and investors, so its dashboard has people in it.

1. **Become a person**: open `/me` and create your profile as a startup or an investor, or just register for any event. No password: the browser keeps a device key.
2. **Find the right event**: `/events` and `/me` show *Picked for you*, ranked by your role, sector, country and who useful is already registered.
3. **Register**: one click once you have a profile. Founders who built a Nexa profile from their deck get the form prefilled.
4. **Event dashboard** (`/events/[id]/live`): only the people at that event, ranked by fit to you, with reasons. Press **Interested**; they get a 🔔 notification. Both sides interested = a **match**, emails unlock, and a founder–investor match is logged as an intro for the host.
5. **Organiser**: `/events/new` to host. The host view shows suggested intros (Suggested → Intro sent → Meeting → Deal), the guest list with CSV, and **Find participants**: people on Nexa who aren't registered yet, ranked by fit, with one-click **Invite**. On demo events press *Demo: open the host view*.
6. **Two people on one laptop**: use a normal window and a private window. Each is a different person.

## Data model (SQLite)

```
events ──1:N── registrations ──N:1── people ──1:N── notifications
   │                │                  │
   │                └── intros (startup reg ↔ vc reg, host funnel)
   ├──1:N── interests (from person → to person, per event; both ways = match)
   └──1:N── invites   (host → person, once per event)
```

Schema with comments: `lib/db.ts`. Created on first request, demo data added if missing, older databases migrated in place.

- **Local:** `~/.nexa/nexa.db` (outside the project on purpose: inside it, `next dev` sees SQLite's -wal/-shm writes as file changes and reloads the page in a loop). Delete it to reset the demo.
- **Fly.io:** `/data/nexa.db` on the `nexa_data` volume (see `fly.toml`).

| Route | Method | What |
| --- | --- | --- |
| `/api/events` | GET / POST | List (with `going` for `x-person-key`) / create (returns `hostKey`) |
| `/api/events/[id]` | GET | Details; `x-host-key` adds guests + intros, `x-person-key` adds `me` |
| `/api/events/[id]/register` | POST | Register; newcomers send a profile and get `personKey` back |
| `/api/events/[id]/participants` | GET | Event dashboard: other guests ranked by fit (guests only) |
| `/api/events/[id]/interest` | POST | `{ toId }`: notify them; mutual = match |
| `/api/events/[id]/intros` | PATCH | Host moves an intro along |
| `/api/events/[id]/candidates` | GET | Host: people not registered yet, ranked by fit |
| `/api/events/[id]/invite` | POST | Host: `{ personId }`, sends an invite notification |
| `/api/me` | GET / POST | Your profile, events, picks / create or edit profile |
| `/api/me/notifications` | GET / POST | List / mark all read |
