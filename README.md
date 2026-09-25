# ReachInbox Scheduler

A full-stack email job scheduler and dashboard: schedule thousands of emails
for a specific time, send them through Ethereal (fake SMTP), and keep working
correctly across restarts — all without a single cron job.

- **Backend:** TypeScript, Express, Prisma, MySQL, BullMQ, Redis, Nodemailer/Ethereal
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Auth:** Google OAuth (Google Identity Services) **or** email + password

## Project structure

```text
reachinbox-scheduler/
├── backend/
│   ├── src/
│   │   ├── config/        # env, Prisma client, Redis connection
│   │   ├── controllers/   # auth.controller.ts, email.controller.ts
│   │   ├── middleware/    # JWT-cookie auth guard
│   │   ├── queue/         # email.queue.ts, email.worker.ts, recovery.ts
│   │   ├── routes/        # /api/auth, /api/emails
│   │   ├── services/      # auth, smtp/ethereal, senders, rate-limit, attachments
│   │   ├── utils/         # recipient parsing, HTML <-> text
│   │   ├── app.ts         # Express app (no listen)
│   │   └── server.ts      # boots recovery -> HTTP server -> worker
│   ├── prisma/schema.prisma + migrations/
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # Sidebar, EmailList, EmailDetail, ComposeModal, RichTextEditor, ui/*
│   │   ├── context/       # AuthContext, ToastContext
│   │   ├── pages/         # Login, Dashboard
│   │   ├── services/api.ts, lib/ (format, emails, html, constants), types/email.ts
│   └── .env.example
└── README.md
```

---

## 1. How to run the backend (Express, Redis, DB, BullMQ worker)

The backend is a single Node process — `npm run dev` starts **both** the
Express API and the BullMQ worker together (see `backend/src/server.ts`).
Before that process can boot, MySQL and Redis both need to be reachable.

### 1a. Get MySQL + Redis running

Install MySQL 8 and Redis 7 locally and start both, then create the
database:

```bash
mysql -u root -p
CREATE DATABASE reachinbox;
EXIT;
```

> **Windows note:** MySQL has an official native installer, but Redis does
> not officially support Windows. Use either WSL2 (`sudo apt install
> redis-server`) or [Memurai](https://www.memurai.com/get-memurai) (a native
> Windows, Redis-compatible service that listens on `127.0.0.1:6379` out of
> the box — no config changes needed).

Verify both are reachable before moving on:

```bash
mysqladmin -u root -p ping     # "mysqld is alive"
redis-cli ping                 # "PONG" (or memurai-cli ping on Windows)
```

### 1b. Install, configure, migrate, run

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Fill in `backend/.env` — see the full [environment variables](#3-environment-variables)
table below.

```bash
npx prisma migrate deploy   # applies every migration in prisma/migrations
npx prisma generate         # regenerates the typed Prisma Client
npm run dev                 # starts the Express API AND the BullMQ worker together
```

The API is now listening on `http://localhost:4000`. Leave this process
running — the BullMQ worker that actually sends emails lives in the same
process, not a separate one.

Other useful scripts:

```bash
npm run typecheck   # tsc --noEmit, no build output
npm run build        # compiles to dist/
npm start            # runs the compiled dist/server.js (production)
```

---

## 2. How to run the frontend

```bash
cd frontend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Fill in:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Where the backend is running, e.g. `http://localhost:4000` |
| `VITE_GOOGLE_CLIENT_ID` | Same value as the backend's `GOOGLE_CLIENT_ID` — leave blank to skip Google sign-in and use email/password only |

```bash
npm run dev
```

Open `http://localhost:5173`.

---

## 3. Environment variables

### Ethereal Email setup

This project sends all mail through [Ethereal](https://ethereal.email/), a
free fake-SMTP service made for testing — nothing ever reaches a real inbox.
Every "sent" email instead gets a **preview URL** that renders exactly what
would have been delivered.

1. Go to https://ethereal.email/create
2. Click **Create Ethereal Account** (no signup required)
3. It generates an email-looking address and a password — copy them into
   `ETHEREAL_USER` and `ETHEREAL_PASSWORD` below
4. Set `EMAIL_FROM` to that same address (or leave it blank — it defaults to
   `ETHEREAL_USER`)

Want multiple senders to rotate between in the Compose screen? Repeat the
step above to generate more accounts and list them in `ETHEREAL_ACCOUNTS`.

### `backend/.env`

| Variable | Purpose | Where it comes from |
|---|---|---|
| `PORT` | Port the Express API listens on | default `4000` |
| `FRONTEND_URL` | Used for CORS | `http://localhost:5173` for local dev |
| `DATABASE_URL` | MySQL connection string | `mysql://<user>:<password>@<host>:<port>/reachinbox` — matches whatever you set up in [1a](#1a-get-mysql--redis-running) |
| `REDIS_HOST` / `REDIS_PORT` | Redis for BullMQ + rate-limit counters | `127.0.0.1` / `6379` for local Redis, WSL2, or Memurai |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID | Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application); add `http://localhost:5173` as an authorized JavaScript origin. Same value goes in the frontend's `VITE_GOOGLE_CLIENT_ID`. Optional — skip for email/password-only auth. |
| `JWT_SECRET` | Signs the session cookie | any long random string, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ETHEREAL_HOST` / `ETHEREAL_PORT` | Ethereal SMTP endpoint | `smtp.ethereal.email` / `587` (defaults, don't change) |
| `ETHEREAL_USER` / `ETHEREAL_PASSWORD` | Ethereal test account credentials | https://ethereal.email/create (see above) |
| `EMAIL_FROM` | Default "from" address | defaults to `ETHEREAL_USER` if blank |
| `ETHEREAL_ACCOUNTS` | Optional extra senders for the "rotate" option | comma-separated `user1:pass1,user2:pass2` pairs, each from a separate ethereal.email/create |
| `WORKER_CONCURRENCY` | BullMQ worker concurrency | default `5` |
| `MIN_EMAIL_DELAY_MS` | Minimum gap between two sends **from the same sender** | default `2000` (ms) |
| `MAX_EMAILS_PER_HOUR` | Hourly cap **per sender** (a campaign's own hourly limit can only lower it) | default `200` |
| `MAX_SEND_ATTEMPTS` | BullMQ attempts per email before it's marked `failed` | default `3` |

### `frontend/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:4000` |
| `VITE_GOOGLE_CLIENT_ID` | Same value as backend's `GOOGLE_CLIENT_ID`, or blank |

---

## 4. Architecture overview

### 4a. How scheduling works (no cron, anywhere)

Every recipient in a Compose submission becomes **one `Email` row** in MySQL
and **one BullMQ delayed job** (`backend/src/queue/email.queue.ts`), added in
bulk with `Queue.addBulk`. The job's `delay` is `scheduledTime - now`; BullMQ
stores delayed jobs in Redis's sorted sets and moves them to the ready queue
itself the moment their time comes. There's no polling loop, no
`setInterval`, no `node-cron` — the entire "wait until time T" behavior is
BullMQ + Redis.

Under load (e.g. 1000+ recipients at once): the schedule endpoint writes all
rows in one DB transaction, then enqueues them with `Queue.addBulk` in chunks
of 500. The HTTP response returns immediately after the writes — it never
waits on any SMTP call. The worker's own concurrency and rate limiter spread
the actual sending out over time automatically.

### 4b. How persistence across restarts is handled

MySQL is the source of truth; the BullMQ job only carries an email ID. On a
normal restart:

- Redis's own persistence (e.g. AOF, if enabled) still has every delayed job,
  so **nothing needs to be re-seeded**.
- The worker restarts and keeps consuming exactly where it left off.

On boot (`backend/src/queue/recovery.ts`), the server also self-heals two
edge cases that a normal restart doesn't hit but a crash or a flushed Redis
can cause:

1. Rows stuck in `processing` (the process died mid-send) are marked
   `failed` with an explicit "interrupted, not retried to avoid a duplicate"
   message — there's no way to know if the SMTP server already accepted the
   message, so the system favors "never send twice" over "maybe send twice."
2. Any `scheduled` row **without** a matching BullMQ job (e.g. Redis data was
   lost) is re-enqueued. Because the job ID is the email's database ID,
   re-adding a job that still exists is a safe no-op.

**Idempotency ("never send the same email twice") — three independent layers:**

1. **BullMQ job ID = database email ID.** `queue.add(..., { jobId: emailId })`
   — adding the same email twice is a no-op at the queue level.
2. **Atomic DB claim.** The worker only proceeds past
   `UPDATE Email SET status='processing' WHERE id=? AND status='scheduled'`,
   checking `updatedCount === 0` to bail out. Two workers racing on the same
   job can only ever have one "win" the claim.
3. **Status guard.** The first thing the worker does is skip the job entirely
   if the row isn't `scheduled` anymore.

### 4c. How rate limiting & concurrency are implemented

- **Concurrency:** the BullMQ `Worker` is created with
  `{ concurrency: WORKER_CONCURRENCY }` — that many jobs run in parallel,
  each safely following the idempotency rules above.
- **Minimum delay between sends:** enforced with a small Lua script
  (`reserveSendGap` in `rate-limit.service.ts`) that atomically reads-and-bumps
  a per-sender "next allowed send time" key in Redis, so the gap is respected
  **even across multiple worker processes** — not just inside one Node event
  loop.
- **Hourly limit:** a second Lua script atomically checks *and* increments
  two Redis counters in one round trip — `rate:sender:<sender>:<hour>`
  (global per sender) and `rate:campaign:<campaignId>:<hour>` (this
  compose run's own configurable `hourlyLimit`) — so concurrent workers can
  never both slip past the cap the way two separate `GET` + `INCR` calls
  could. When either counter is full, the job is pushed to the next hour
  window with `job.moveToDelayed(...)` **and** the DB row's `scheduledTime`
  is updated to match, so the dashboard reflects the new time. Jobs are never
  dropped or permanently failed for hitting the limit.
- The hourly rate limit is enforced **per sender** *and* **per campaign**,
  whichever is stricter — that's what lets one Compose submission's own
  "Hourly limit" field mean something even when several campaigns share a
  sender.

---

## 5. Features implemented

### Backend

| Feature | Where / how |
|---|---|
| **Scheduler** | `queue/email.queue.ts` — one BullMQ delayed job per recipient, `delay = scheduledTime - now`, bulk-inserted via `Queue.addBulk` in chunks of 500 |
| **Persistence across restarts** | `queue/recovery.ts` on boot: marks stuck `processing` rows `failed`, re-enqueues any `scheduled` row missing its BullMQ job; Redis AOF persistence keeps delayed jobs across restarts |
| **Idempotency / no duplicate sends** | job ID = email DB ID (no-op re-add), atomic `UPDATE ... WHERE status='scheduled'` claim, status guard at the top of the worker |
| **Rate limiting** | Redis Lua scripts in `rate-limit.service.ts`: per-sender minimum send gap (`MIN_EMAIL_DELAY_MS`) and per-sender + per-campaign hourly caps, both atomic across worker processes |
| **Concurrency control** | BullMQ `Worker({ concurrency: WORKER_CONCURRENCY })` |
| **Sender rotation** | `sender.service.ts` — round-robins across all configured Ethereal accounts when "rotate" is chosen |
| **Email attachments** | `services/attachment.service.ts` + multer memory storage on `POST /api/emails/schedule` — files are base64-encoded onto the campaign row and attached via Nodemailer on send (max 8 files, 10MB each, 20MB total per campaign) |
| **Auth** | Google OAuth (Google Identity Services ID-token flow, verified server-side with `google-auth-library`) and scrypt-hashed email/password, both behind a JWT session cookie |
| **Recipient parsing** | `utils/email-parser.ts` — accepts CSV, newline/comma-separated text, or a JSON array; reports how many rows were valid vs. skipped |
| **Cancel scheduled email** | `DELETE /api/emails/:id` — removes the BullMQ job and marks the DB row cancelled |
| **Stats / search** | `GET /api/emails/stats`, `GET /api/emails/scheduled|sent?q=&limit=&offset=` for the sidebar badges and search |

### Frontend

| Feature | Where / how |
|---|---|
| **Login** | `pages/Login.tsx` + `context/AuthContext.tsx` — Google sign-in button and an email/password form, session restored via `GET /api/auth/me` on load |
| **Dashboard** | `pages/Dashboard.tsx` — sidebar (avatar, name, email, Compose button, Scheduled/Sent tabs with live counts), list/detail layout, search, empty states, loading skeletons, light 15s polling that refreshes data silently (no skeleton flash) so a `scheduled` row flips to `sent` without a manual refresh |
| **Compose modal** | `components/ComposeModal.tsx` — From (single sender or "rotate across all senders"), CSV/text leads upload with a valid/skipped count, Subject, rich-text body editor, delay-between-emails and hourly-limit fields, file attachments with per-file and total size limits enforced client-side, and a "Send Later" popover with quick presets plus a custom date/time picker |
| **Rich text editor** | `components/RichTextEditor.tsx` — lightweight `execCommand`-based editor (bold/italic/underline/lists/links), no external dependency |
| **Email tables/lists** | `components/EmailList.tsx` — Scheduled and Sent tabs, search-filtered, skeleton loading state, empty states |
| **Email detail view** | `components/EmailDetail.tsx` — full body, delivery status, Ethereal preview link, attachments, cancel action for still-scheduled emails |
| **Toasts** | `context/ToastContext.tsx` — success/error notifications for schedule/cancel actions |
| **Typed API layer** | `services/api.ts` + `types/email.ts` — every request/response shape is typed end-to-end |

---

## 6. API reference

| Method & path | Purpose |
|---|---|
| `POST /api/auth/google` | Verify a Google ID token, create/log in the user, set session cookie |
| `POST /api/auth/register` | Email + password sign-up |
| `POST /api/auth/login` | Email + password login |
| `GET /api/auth/me` | Current session's user |
| `POST /api/auth/logout` | Clear session cookie |
| `POST /api/emails/schedule` | Create a campaign + N emails (with optional attachments), enqueue BullMQ jobs |
| `GET /api/emails/scheduled?q=&limit=&offset=` | List not-yet-sent emails (search + pagination) |
| `GET /api/emails/sent?q=&limit=&offset=` | List sent/failed emails |
| `GET /api/emails/stats` | Counts for the sidebar badges |
| `GET /api/emails/senders` | Configured Ethereal sender addresses |
| `GET /api/emails/:id` | Full email detail, incl. Ethereal preview URL and attachments |
| `DELETE /api/emails/:id` | Cancel a still-`scheduled` email |

---

## 7. Demoing the restart scenario

1. Compose an email to 2–3 test addresses a few minutes in the future.
2. Stop the backend process (`Ctrl+C`) — leave Redis and MySQL running.
3. Restart it (`npm run dev`). Watch the console log the recovery summary.
4. Confirm the emails still land in "Sent" at (roughly) their original time,
   and that nothing appears twice.

---

## 8. `.gitignore`

A single `.gitignore` at the project root covers both `backend/` and
`frontend/`:

```
node_modules/
dist/
.env
.env.*
!.env.example
coverage/
.DS_Store
*.log
```

- `.env` files are never committed — only `.env.example` is, which is why you
  copy it to `.env` and fill in your own values on every fresh clone.
- `node_modules/` and `dist/` are ignored, so `npm install` (and the build
  step) must be run after cloning.
- Prisma's generated client lives inside `node_modules/@prisma/client`, so
  it's excluded too — `npx prisma generate` has to be run fresh on every
  clone rather than being committed.

---

## 9. Assumptions & trade-offs

- Any local MySQL 8 / Redis 7 works (on Windows, WSL2 or Memurai for Redis).
- The rich-text compose editor uses the browser's built-in `execCommand`.
  It's deprecated but still supported everywhere Chrome/Firefox/Safari ship,
  and keeps the editor dependency-free; a production version would likely
  swap in a maintained library (Tiptap, Lexical, etc.).
- Emails are sent as both `text` (auto-derived) and `html`.
- If a delivery attempt's *final* try fails, the row is marked `failed` (not
  silently retried forever) — visible in the Sent tab with the SMTP error
  message.
- There's a narrow, documented crash window between "Ethereal accepted the
  message" and "the DB row is marked sent" (a hard problem without a
  two-phase-commit-style outbox). Recovery favors never double-sending over
  never losing a send in that specific window, and says so explicitly rather
  than hiding it.
