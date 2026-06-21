# StockFlow — Inventory Management

A two-sided inventory app, built to run entirely on Vercel:

- **Owner page** (`/owner`) — password-protected dashboard with the full product list, stock levels, low-stock alerts, and a live feed of every scan.
- **Worker page** (`/worker`) — full-screen camera barcode scanner to add or remove stock. No login required.
- **Telegram alerts** — every scan (add, remove, or new item created) sends a message to your Telegram.

## How it's built

- **Frontend**: React + Vite, in `src/`
- **Backend**: Vercel serverless functions, in `api/` — no separate server to run
- **Database**: Postgres (via Vercel's Neon integration) — replaces the old local JSON file so data survives deploys and works across multiple devices at once
- **Notifications**: Telegram Bot API, called server-side from `api/_lib/telegram.js`

## 1. Connect a database (one-time setup)

1. Push this project to GitHub if you haven't already, and import it into Vercel.
2. In your Vercel project, go to **Storage → Create Database → Postgres** (powered by Neon) and connect it to this project.
3. Vercel automatically adds a `DATABASE_URL` environment variable — you don't need to copy/paste anything.
4. The first request to any `/api` route automatically creates the tables and seeds:
   - The owner password (**192121**)
   - One sample product, so the dashboard isn't empty

## 2. Set up Telegram notifications

1. In Telegram, message **@BotFather** and send `/newbot`. Follow the prompts (name + username ending in `bot`).
2. BotFather gives you a token like `7123456789:AAH4d...` — this is `TELEGRAM_BOT_TOKEN`.
3. Message your new bot anything (e.g. "hi") so it knows who you are.
4. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser. Find `"chat":{"id":12345678,...}` in the response — that number is `TELEGRAM_CHAT_ID`.
5. In Vercel: **Project Settings → Environment Variables**, add:
   - `TELEGRAM_BOT_TOKEN` = your token
   - `TELEGRAM_CHAT_ID` = your chat id
6. Redeploy (or it'll apply on the next deploy automatically).

Until these two variables are set, the app still works fine — it just skips sending the Telegram message (and logs a warning), so you can deploy in stages.

## 3. Set the JWT secret

Also in **Project Settings → Environment Variables**, add:
- `JWT_SECRET` = a long random string (anything works, just keep it private)

Generate one locally if you want:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Deploy

If the project is already connected to Vercel + GitHub, just push to your main branch:
```bash
git add .
git commit -m "Add Telegram notifications and Postgres backend"
git push
```
Vercel will build and deploy automatically. Your app will be live at `https://<your-project>.vercel.app`, with:
- `/` — landing page
- `/owner` — owner login (password `192121` unless you've changed it)
- `/worker` — barcode scanner

## Running locally

```bash
npm install
npm i -g vercel        # if you don't have it
vercel link            # connect this folder to your Vercel project (one-time)
vercel env pull        # pulls DATABASE_URL, JWT_SECRET, TELEGRAM_* into .env.local
npm run dev            # runs `vercel dev`, which serves both the frontend AND /api functions
```

This opens the app at `http://localhost:3000` (or whatever port `vercel dev` reports), with the real Postgres database and real Telegram notifications — since `vercel dev` runs your actual `/api` functions, not a mock.

If you just want to iterate on frontend styling without touching the API, `npm run dev:vite-only` runs the plain Vite dev server (faster, but API calls will fail unless you also have a backend running separately).

## Using the worker scanner on a phone

Camera access requires HTTPS (or localhost) — your deployed Vercel URL is HTTPS by default, so just open `https://<your-project>.vercel.app/worker` on the phone's browser and allow camera access when prompted.

## Changing the owner password

There's a "Change password" capability already wired into the backend (`/api/owner/change-password`). Ask me to add a button for it in the dashboard UI if you'd like, or change it directly by calling that endpoint with your current and new password.

## Notes on the database

Tables (`products`, `scan_log`, `settings`) are created automatically on first request — there's no manual migration step. If you ever want to reset everything, you can drop the tables from the Vercel/Neon dashboard's SQL editor and they'll be recreated (with a fresh sample product and the default password) on the next request.
