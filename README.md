# ReachInbox Scheduler — Windows Setup (No Docker, Redis = Memurai)

Setup guide for Windows users who don't want Docker and are using **Memurai**
(a native Windows, Redis-compatible service) for Redis.

## Prerequisites

| Tool | Where to get it |
|---|---|
| Node.js 18+ | https://nodejs.org (LTS installer) — verify with `node -v` |
| Git | https://git-scm.com/download/win |
| MySQL 8 | native Windows installer, see [Step 1](#1-install-mysql-native-windows) |
| Memurai | Redis-compatible, native Windows, see [Step 2](#2-install-memurai-redis-for-windows) |

## 1. Install MySQL (native Windows)

1. Download the MySQL Installer: https://dev.mysql.com/downloads/installer/
   (get `mysql-installer-community-x.x.x.msi`)
2. Run it. Setup Type: **Server only** (fastest) or **Full**.
3. During setup it asks you to set a **root password** — pick one and write it
   down. You'll need it for `DATABASE_URL` later.
4. Finish the wizard. MySQL installs as a Windows Service and starts
   automatically. Confirm: open Services (`Win+R` → `services.msc`) and check
   **MySQL80** is `Running`.
5. Open **MySQL 8.0 Command Line Client** from the Start menu (or in
   PowerShell: `mysql -u root -p`), enter your root password, then create the
   project's database:

   ```sql
   CREATE DATABASE reachinbox;
   EXIT;
   ```

   Quick reachability check:

   ```powershell
   mysqladmin -u root -p ping
   ```
   should print `mysqld is alive`.

## 2. Install Memurai (Redis for Windows)

1. Download the free Developer edition: https://www.memurai.com/get-memurai
2. Run the installer. It installs and starts as a Windows Service
   automatically, listening on `127.0.0.1:6379` — same default host/port as
   real Redis, so no extra config is needed.
3. Confirm it's running: open Services (`Win+R` → `services.msc`), look for
   **Memurai**, status should be `Running`. It's set to auto-start with
   Windows, so you shouldn't need to touch this again.
4. Verify it actually responds:

   ```powershell
   memurai-cli ping
   ```
   Should reply `PONG`. If PowerShell says `memurai-cli` isn't recognized,
   it's not on `PATH` — call it from the install folder instead
   (typically `C:\Program Files\Memurai\memurai-cli.exe ping`), or just skip
   this check and rely on [Step 6](#6-verify-everything-works-including-memurai-specifically) instead.

## 3. Clone the repo

```cmd
git clone https://github.com/asifkhan2303/email_scheduler.git
cd email_scheduler
```

## 4. Backend setup

```cmd
cd backend
npm install
copy .env.example .env
```

Open `backend\.env` in a text editor and fill in every value:

| Variable | What it is / where to get it |
|---|---|
| `PORT=4000` | Port the API listens on. Leave as-is unless it conflicts with something else. |
| `FRONTEND_URL=http://localhost:5173` | Used for CORS. Leave as-is for local dev. |
| `DATABASE_URL="mysql://root:<PASSWORD>@127.0.0.1:3306/reachinbox"` | Replace `<PASSWORD>` with the MySQL root password you set in Step 1. |
| `REDIS_HOST=127.0.0.1` / `REDIS_PORT=6379` | Memurai listens here by default — no changes needed. |
| `GOOGLE_CLIENT_ID` | **Optional**, only for "Sign in with Google". See [Google OAuth setup](#google-oauth-setup-optional) below. |
| `JWT_SECRET` | Any long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ETHEREAL_HOST/PORT/USER/PASSWORD` | Free fake-SMTP test account. See [Ethereal setup](#ethereal-setup) below. |
| `EMAIL_FROM` | Defaults to `ETHEREAL_USER` if left blank. |
| `ETHEREAL_ACCOUNTS` | **Optional** — extra `user:pass` pairs, comma-separated, for multiple rotating senders. |
| `WORKER_CONCURRENCY` / `MIN_EMAIL_DELAY_MS` / `MAX_EMAILS_PER_HOUR` / `MAX_SEND_ATTEMPTS` | Worker tuning knobs — defaults are fine. |

### Google OAuth setup (optional)

1. Go to https://console.cloud.google.com/
2. Create or select a project
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID →
   Web application**
4. Under **Authorized JavaScript origins** add `http://localhost:5173`
5. Copy the Client ID into `GOOGLE_CLIENT_ID` here, and the **same value**
   into `frontend\.env` as `VITE_GOOGLE_CLIENT_ID` (Step 5)

Skip this entirely if email/password login is fine — no setup needed for that.

### Ethereal setup

1. Go to https://ethereal.email/create
2. Click **Create Ethereal Account** (no signup needed)
3. Copy the generated address into `ETHEREAL_USER`, the generated password
   into `ETHEREAL_PASSWORD`
4. Set `EMAIL_FROM` to that same address (or leave blank)

Nothing is really delivered — Ethereal is a sandbox that gives you a preview
link instead of sending real email.

### Apply the schema and start the backend

```powershell
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Leave this PowerShell window open — it runs **both** the API and the
background email worker (which is what actually talks to Memurai via
BullMQ). Backend is now on http://localhost:4000.

> `prisma migrate deploy` usually regenerates the client as a side effect too,
> but running `prisma generate` explicitly afterward is the safe,
> deterministic way to make sure the typed Prisma Client in `node_modules`
> matches your schema.

## 5. Frontend setup

Open a **second** PowerShell window:

```powershell
cd reachinbox-scheduler\frontend
npm install
copy .env.example .env
```

Open `frontend\.env` and fill in:

| Variable | What it is |
|---|---|
| `VITE_API_URL=http://localhost:4000` | Must match backend's `PORT`. Leave as default. |
| `VITE_GOOGLE_CLIENT_ID` | Same value as backend's `GOOGLE_CLIENT_ID`, or leave blank if you skipped Google OAuth. |

Then:

```powershell
npm run dev
```

Open http://localhost:5173 in your browser.

## 6. Verify everything works (including Memurai specifically)

1. `memurai-cli ping` → `PONG` confirms Memurai itself is alive.
2. `Test-NetConnection -ComputerName 127.0.0.1 -Port 6379` → `TcpTestSucceeded : True` confirms something's listening on the exact host/port `backend\.env` points at.
3. Start the backend (`npm run dev` in `backend\`). Watch the console — if it
   boots cleanly with no repeated
   `Unhandled error event: Error: connect ECONNREFUSED 127.0.0.1:6379`
   messages, the app connected to Memurai fine.
4. http://localhost:5173 shows the login screen. Sign up with email +
   password (or Google, if configured).
5. Compose an email to 1–2 addresses scheduled a couple minutes in the
   future, hit Send.
6. The real end-to-end proof: watch it move from **Scheduled** to **Sent** in
   the dashboard on its own around that time. That's BullMQ's delayed job
   firing through Memurai — confirms the whole queue pipeline, not just a raw
   ping.
7. Check the backend console for an Ethereal preview URL and open it to see
   the "sent" email.

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| Backend hangs / `ECONNREFUSED` on `127.0.0.1:6379` | Memurai service isn't running — open `services.msc`, find **Memurai**, right-click → Start. Check it hasn't been disabled. |
| `memurai-cli : command not found` | Not on `PATH`. Add `C:\Program Files\Memurai` to `PATH`, or call the full path: `& "C:\Program Files\Memurai\memurai-cli.exe" ping` |
| Prisma: `Can't reach database server at 127.0.0.1:3306` | Open `services.msc`, check **MySQL80** is `Running`. If stopped, right-click → Start. |
| `Access denied for user 'root'@'localhost'` | Wrong password in `DATABASE_URL` — must exactly match what you set during the MySQL installer. |
| Port already in use (3306, 6379, 4000, or 5173) | Something else is using it — stop it, or change the port in `backend\.env` / `frontend\.env` (keep both files consistent). If you change Memurai's port, update it in Memurai's own config too. |
| `npm run dev` fails immediately with an env/connection error | Check `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, and `JWT_SECRET` are all filled in `backend\.env`. Google/Ethereal fields can stay blank, but those specific features won't work. |
| Google sign-in doesn't appear | `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` empty or mismatched, or `http://localhost:5173` not added as an authorized origin in Google Cloud Console. Email/password login works regardless. |