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

## POC walkthrough

**Live demo event:** *Hacktoberfest Hack Day Kuala Lumpur* (Sat 31 Oct 2026, DOJO KL) is seeded with founders and investors, so its dashboard has people in it.

1. **Become a person**: open `/me` and create your profile as a startup or an investor, or just register for any event. No password: the browser keeps a device key.
2. **Find the right event**: `/events` and `/me` show *Picked for you*, ranked by your role, sector, country and who useful is already registered.
3. **Register**: one click once you have a profile. Founders who built a Nexa profile from their deck get the form prefilled.
4. **Event dashboard** (`/events/[id]/live`): only the people at that event, ranked by fit to you, with reasons. Press **Interested**; they get a 🔔 notification. Both sides interested = a **match**, emails unlock, and a founder–investor match is logged as an intro for the host.
5. **Organiser**: `/events/new` to host. The host view shows suggested intros (Suggested → Intro sent → Meeting → Deal), the guest list with CSV, and **Find participants**: people on Nexa who aren't registered yet, ranked by fit, with one-click **Invite**. On demo events press *Demo: open the host view*.
6. **Two people on one laptop**: use a normal window and a private window. Each is a different person.

Also: `/app` to add a startup from a deck (Gemma 4), a text description, or **Fill in a form** (no API key needed).

## Data model (SQLite, `.data/nexa.db`)

```
events ──1:N── registrations ──N:1── people ──1:N── notifications
   │                │                  │
   │                └── intros (startup reg ↔ vc reg, host funnel)
   ├──1:N── interests (from person → to person, per event; both ways = match)
   └──1:N── invites   (host → person, once per event)
```

Schema with comments: `lib/db.ts`. Created on first request, demo data added if missing, older databases migrated in place. Delete `.data/` to reset.

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

## Files

- `app/page.tsx`: landing page
- `components/Workspace.tsx`: upload → matches → Ask Nexa → tracker
- `lib/opportunities.ts`: 29 demo opportunities (real organisation names; amounts and deadlines are illustrative)
- `lib/gemma.ts`: Gemma 4 calls and output cleaning
- `components/events/`: event list, create form, event page + host view
- `lib/db.ts`: SQLite schema, migration, demo data
- `lib/events.ts`: events, registration, host intros, find + invite participants
- `lib/people.ts`: people, event dashboard, interest, notifications, picks
- `lib/eventMatch.ts`: fit rules (founder ↔ investor, founder ↔ founder, investor ↔ investor, person ↔ event)
