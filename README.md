# AI Career Agent: your own free job-search website

A personal web app that keeps your career profile, **searches live company career boards for roles that are open right now**, scores them against your resume, tailors your resume, waits for your approval before any application, tracks every application, and alerts you by Telegram, email and browser push. Everything runs on free tiers, so it costs ₹0.

There is no sample data: the site starts empty and fills with real openings as soon as you add your resume, say what job you want and press **Search open roles**.

| Piece | Free service | What it does |
|---|---|---|
| Website | **GitHub Pages** | Hosts the site at **https://gjayakesh.github.io/AI-job-finder/**. Installable on your phone. |
| Cloud database + login | **Supabase** (project `vrytpkcxmmgjltihptee`) | Email/password login. All your data, private to your account (row-level security). |
| Alerts + job discovery | **GitHub Actions** | Runs `worker/run.mjs` every 30 minutes: finds new jobs, scores them, sends alerts. |
| Telegram alerts | **Telegram Bot API** | Instant phone alerts. |
| Email alerts | **Resend** | Daily digest, weekly report, urgent reminders. |
| Browser push | **Web Push** (VAPID keys) | Pop-up alerts on phone/desktop. |
| Job search | **Greenhouse**, **Lever**, **Ashby**, **SmartRecruiters** career boards, **Remotive**, **Remote OK**, and **Adzuna** (free key, server only) | Public job APIs that list only open roles. The search runs in your browser with no setup; the server job repeats it on a schedule. LinkedIn/Naukri are never scraped. |
| AI (optional) | **Google Gemini** free tier | AI-written tailoring and analyses. Without it, the built-in local engine does everything. |

**Live site: https://gjayakesh.github.io/AI-job-finder/** (code: https://github.com/gjayakesh/AI-job-finder)

Setup takes about 30–40 minutes. Do the steps in order.

---

## Step 1 — Put the code on GitHub ✅ already done

The code is in the public repository `gjayakesh/AI-job-finder` (public is needed for free Pages and unlimited Actions minutes; there are no secrets in the code). To publish later changes from this folder:

```bash
git add -A
git commit -m "Describe the change"
git push
```

> Uploading through the GitHub web page can skip the hidden `.github` folder. Use the commands above.

## Step 2 — Database table ✅ already done

The `docs` table, its row-level security policy and the update trigger were created in your project **AI-JOB** (`vrytpkcxmmgjltihptee`) on 9 Nov 2026 and verified: signed-out visitors are refused, and a signed-in user can't write another user's rows. Supabase's security advisor reports no issues.
If you ever create a new project, paste `supabase/schema.sql` into **SQL Editor → Run** to recreate it.

## Step 3 — Website connected to Supabase ✅ already done

`config.js` already holds your project URL and its **publishable** key (`sb_publishable_…`). That key is designed to be public; your data is protected by row-level security.
**Never** put the secret/service_role key, your database password or any bot token in `config.js`.

## Step 4 — Turn on the website

1. ✅ Already done: GitHub Pages deploys the `main` branch (folder `/ (root)`). Every push updates the site within a minute or two.
2. Your site is at `https://gjayakesh.github.io/AI-job-finder/`.
3. ✅ Already done (9 Nov 2026): Supabase → **Authentication → URL Configuration** has **Site URL** and **Redirect URLs** set to `https://gjayakesh.github.io/AI-job-finder/`.
   This makes the confirmation, sign-in-link and password-reset emails link back to your site. If the site address ever changes, update both.

## Step 5 — Create your account

1. Open your site → **Create an account** with your email and a password.
2. Open the confirmation email from Supabase and click the link, then sign in.
3. Follow the **Get set up** checklist on the Dashboard: add your resume (PDF/DOCX), say what job you want, then press **Search now**.
4. Recommended for a personal site: Supabase → **Authentication → Sign In / Providers** → turn off **Allow new users to sign up**, so nobody else can create an account on your site.

> Supabase's built-in email sender is rate-limited (a few emails per hour). That's fine for one person.

## Step 6 — Set up the alert channels

Do the ones you want; each is independent.

**Telegram (recommended, instant and unlimited)**
1. In Telegram, open **@BotFather** → `/newbot` → pick a name and a username ending in `bot`.
2. BotFather gives you a **token** → save it for step 7 as `TELEGRAM_BOT_TOKEN`.
3. Put the bot's username (without `@`) in `config.js` → `TELEGRAM_BOT_USERNAME`, then push.

**Email (Resend)**
1. Sign up at resend.com **with the same email address you want alerts at**. On the free plan, Resend only delivers to your sign-up address unless you verify a domain. That's fine for a personal site.
2. Create an API key → save it for step 7 as `RESEND_API_KEY`.

**Browser push**
1. On any computer with Node.js: `npx web-push generate-vapid-keys`
2. Put the **Public Key** in `config.js` → `VAPID_PUBLIC_KEY`, then push.
3. Save both keys for step 7 (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
4. On iPhone, push works only after **Share → Add to Home Screen** and opening the site from the home-screen icon.

**Adzuna job search (India)**
1. Register at developer.adzuna.com (free, instant) → copy your **App ID** and **App Key** for step 7.
2. The free key allows a few hundred calls per day. The worker uses at most about 12.

## Step 7 — Add the secrets and start the alert job

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Value | Required |
|---|---|---|
| `SUPABASE_URL` | `https://vrytpkcxmmgjltihptee.supabase.co` | optional (read from `config.js` if missing) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → **secret** key (`sb_secret_…`) or legacy **service_role** key | yes |
| `APP_URL` | your site address, `https://gjayakesh.github.io/AI-job-finder/` | optional (defaults to this repo's GitHub Pages address) |
| `TELEGRAM_BOT_TOKEN` | from BotFather | for Telegram |
| `RESEND_API_KEY` | from Resend | for email |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | from `web-push generate-vapid-keys` | for push |
| `VAPID_SUBJECT` | `mailto:you@example.com` | for push |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | from Adzuna | for Adzuna search |
| `ALERT_FROM_EMAIL` | only if you verified a domain in Resend, e.g. `Career Agent <alerts@yourdomain.com>` | optional |

The secret key bypasses row-level security, so it lives **only** in GitHub secrets, never in code or chat.

Then: repo → **Actions** → enable workflows if asked → **Career agent** → **Run workflow** (tick "Search the job feeds now"). Watch the run log; it should end with `user done: …`.

## Step 8 — Switch alerts on in the website

1. Open your site → **Notifications** (left menu).
2. The **Alert server** card should say **Running** with the time of the last run.
3. Tick **Email** and check the address. Tick **Telegram** → **Connect Telegram** → tap **Start** in the bot. The next run links your chat and the bot replies "Connected". Click **Enable on this device** for push.
4. Choose what to be alerted about, your minimum match score for new jobs, and your daily digest time.
5. Under **Scheduled job search**, choose which sources the server repeats every 6 hours. The companies it searches are the ones on your **Job Discovery** page.
6. Click **Save notification settings**, then **Send a test alert**. It arrives on the next run, or immediately if you click **Run workflow** again.

Also fill in **Job Preferences** (titles, cities, salary). Every search uses those.

## Finding jobs that are open to apply

**Job Discovery → Search open roles** reads the live listings of the company career boards on your list (62 suggested companies with open roles in India, checked on 10 Nov 2026) plus the Remotive and Remote OK feeds, straight from your browser. It needs no keys and no server setup.

- **Only open roles.** These boards list a job only while the employer accepts applications. Each job keeps the employer's own application link.
- **Closed roles are flagged.** Every search re-checks the jobs you saved. If the employer has taken one down it is marked **Closed**, hidden from the default list and can't be prepared or submitted. On a job page, **Check now** re-checks that one posting.
- **What is kept.** A role must match one of your job titles (or be a general software role whose required skills fit your profile), your seniority, and your cities. Roles in other countries, roles far above or below your experience, and duplicates are dropped.
- **Your companies.** Remove any suggested company, or add one by pasting its careers link (`boards.greenhouse.io/…`, `jobs.lever.co/…`, `jobs.ashbyhq.com/…`, `jobs.smartrecruiters.com/…`). The link is checked before it is added.
- **Other sites.** LinkedIn, Naukri, Indeed and similar sites don't allow automated access. Use the ready-made search links, then **Import a job** by pasting the posting.
- **More coverage.** Adzuna's India-wide search runs only in the scheduled server job (step 7), because it needs a private key.

Applying is always yours to approve: **Prepare application** builds the tailored resume and the answers, the Approval Center locks the exact version you approve, and **Submit** opens the employer's application page with your answers ready to paste. The site never submits anything by itself.

## What you get alerted about

| Alert | When | Channels |
|---|---|---|
| New matching job | A feed finds a job at or above your minimum score (up to 5 per run) | Telegram, push |
| Interview tomorrow | 24 h before | Telegram, push, email |
| Interview soon | 2 h before | Telegram, push |
| Deadline | Application deadline or offer response date within 2 days | Telegram, push, email |
| Waiting for approval | An application prepared more than 24 h ago | Telegram, push |
| Approval expiring | Within 24 h | Telegram, push |
| Follow-up nudge | No update for 10 days after applying | Telegram |
| Daily digest | Once a day at your chosen hour | Email, Telegram |
| Weekly report | Mondays | Email, Telegram |

Every alert also appears in the bell icon inside the site. Each alert is sent once.

## Optional — AI with a free Gemini key

Configuration → **AI provider** → paste a key from aistudio.google.com/apikey → tick **Use Gemini**. The site asks before sending your resume or profile. On Google's free tier, prompts may be used to improve Google's products. If you'd rather keep everything private, leave it off: the local engine handles every feature.

## Staying signed in

Once you sign in on a device, you stay signed in there: reloading, closing the tab or browser, and restarting the phone or computer don't sign you out. A sign-in ends only when:

- you click **Sign out** (left menu or Configuration → Account), or
- that device goes **30 days without activity**. Opening the site, clicking, typing and scrolling all count as activity, so using it at least once a month keeps you signed in. The next time you open it after 30 idle days, it asks you to sign in again and says why.

Each device keeps its own timer, and signing out for inactivity on one device doesn't affect your other devices. If the server can't be reached (no internet, or the Supabase project is paused), you are not signed out: the sign-in screen says the server is unreachable, and reloading once you're back online returns you to your data.

## Keeping it running for free

- **Supabase free projects pause after about a week with too little activity.** The scheduled job touches the database every 30 minutes, which keeps it active. That works even before you add the step 7 secrets: until then the job skips alerts and only keeps the database awake. If it ever pauses, open the Supabase dashboard and click **Restore**.
- **GitHub turns off scheduled workflows after 60 days without repository activity.** The workflow makes a tiny commit to `worker/heartbeat.txt` every 45 days to prevent this. If the site shows "The alert server last ran …", open Actions and click **Enable workflow**.
- GitHub can delay scheduled runs when it is busy. Alerts are usually on time, but not guaranteed to the minute.
- Remotive asks for attribution and limited polling. The site shows "via Remotive" with the original link, and the job checks it once a day.

## Security checklist

- [ ] Reset your Supabase **database password** (Project Settings → Database). The app never uses it.
- [ ] `config.js` contains only the public URL, publishable/anon key, VAPID public key and bot username.
- [ ] Secret/service_role key, bot token, Resend key and VAPID private key are only in GitHub secrets.
- [ ] New sign-ups turned off after creating your account (step 5).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Site shows "data is saved in this browser only" | `SUPABASE_ANON_KEY` in `config.js` is still the placeholder. |
| "Can't reach the server" on sign-in | The Supabase project is paused. Restore it in the dashboard. |
| Confirmation link says expired | Sign in with your password anyway (the email is confirmed), or request a new link. |
| Notifications page: "Waiting for first run" | Add the secrets (step 7) and click Run workflow. |
| Channel shows "missing … secret" | Add that secret in GitHub and run the workflow again. |
| Telegram "not linked yet" | Tap Connect Telegram, press Start in the bot, then wait for the next run (or run the workflow). |
| No email arrives | On Resend's free plan the address must be your Resend sign-up email. |
| Adzuna shows an error | Check `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`. Free keys have daily limits. |
| Search finds nothing new | Use broader job titles or more cities in Job Preferences, add companies on Job Discovery, or import a posting you found elsewhere. |
| A board "could not be read" | The company moved its careers site. Remove it on Job Discovery, or add its new careers link. |

## For developers

- `src/` is the source of the website (vanilla JS, no build tooling needed beyond `bash tools/build.sh`, which regenerates `index.html` and `worker/engine.mjs`). `src/02a-feeds.js` is the job search shared by the browser and the server job; `src/04a-motion.js` holds the scroll animations.
- `worker/run.mjs` is the scheduled job (Node 22). Dry run locally: `DRY_RUN=true SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node worker/run.mjs`.
- `dev/mock-server.mjs` mocks Supabase (auth + REST), the job APIs, Telegram, Resend and push for local testing. The site it serves gets a test `config.js`, so local sign-ups never touch your real database.
- Tests (run `bash tools/build.sh` and `npm ci` in `worker/` first):
  - `node dev/test-engine.mjs` — title, seniority and location filters, posting extraction, scoring. No server needed.
  - `node dev/mock-server.mjs` in one terminal (set `MOCK_SITE_PORT` if 8080 is taken), then `NODE_TLS_REJECT_UNAUTHORIZED=0 node dev/test-worker.mjs` for the server job.
  - `pip install playwright`, then `python dev/test_site.py` for the website in a real browser (`SITE_URL=http://localhost:<port>/` if you changed the port).
- Data model: one row per item in `public.docs (user_id, kind, id, data jsonb, updated_at)`. Kinds: `profile, prefs, settings, notify, meta, logs, notifs, chat, reports` (id `main`), `jobs, versions, resumes, alerts` (one row each), and `server` (`status`, `state`, `links`) written by the job.
