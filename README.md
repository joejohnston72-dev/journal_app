# Journal

A calm, local-first morning journal for iPhone, built as an installable web app (PWA). Brief and requirements: [`docs/brief.md`](docs/brief.md). Rules for Claude Code: [`CLAUDE.md`](CLAUDE.md).

## Status: Phase 0 — Foundations

| P0 item | State |
|---|---|
| Repo with brief at `docs/brief.md` | Done |
| `CLAUDE.md` + hook blocking destructive commands | Done (`.claude/`) |
| PWA shell: Today, Journal, Settings, full-screen editor, offline service worker, Home Screen icons | Done |
| Local store: save per keystroke + crash buffer, revisions, bin | Done |
| Sync spike: offline edits, two-device conflict, restore | Done, tested against an in-memory server and real Postgres |
| Supabase schema, row-level security, append-only history | Written (`supabase/migrations`), tested on Postgres 16 — **you create the project** |
| CI (typecheck, safety suite, SQL tests, build) | Done (`.github/workflows/ci.yml`) |
| Hosting over HTTPS | Workflow ready — **you enable Pages** (see below) |
| Claude Console key + spend limit | **You** (not needed until P2) |
| Hello-world on Home Screen + test notification | Ready once deployed. Real Web Push (server-sent) lands with NOTIF-1 in P1 |
| Nightly backup to a second provider | P1 (format exists: the backup file; provider is an open decision) |
| Design tokens, first draft | Done (`src/styles/tokens.css`, “First Light” placeholder) |

## Run locally

```sh
npm install
npm run dev          # http://localhost:5173 — local-only unless .env.local is set
npm test             # unit + data-safety suite
npm run build
```

## Your setup steps

### 1. Hosting (GitHub Pages)
1. Repo **Settings → Pages → Source: GitHub Actions**. (Pages on a *private* repo needs GitHub Pro; otherwise use Cloudflare Pages or Netlify with `npm run build`, output `dist`.)
2. Merge to `main`; the *Deploy* workflow publishes to `https://<you>.github.io/journal_app/`.

### 2. Supabase (server copy)
1. Create a project in the **West EU (London)** region. Save the database password in your password manager.
2. **SQL Editor** → paste and run `supabase/migrations/20261120000000_init.sql`. It grants table access explicitly (new projects no longer expose tables automatically).
3. **Authentication → Users → Add user → Create new user**: your email, a strong password (save it in your password manager), tick **Auto Confirm User**.
4. **Authentication → Sign In / Providers**: turn **off** “Allow new users to sign up”. Leave the Email provider on.
5. **Project Settings → API Keys**: copy the Project URL and the **publishable** key (`sb_publishable_…`) into repo **Settings → Secrets and variables → Actions → Variables** as `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Never the secret key.
6. Re-run the Deploy workflow. In the app: Settings → Server backup → sign in with that email and password (once per device).

Sign-in is email + password for now, so no email is ever sent and no custom SMTP is needed. Passkeys (Face ID) replace it in P1.

### 3. iPhone
1. Open the Pages URL in Safari → Share → **Add to Home Screen**.
2. Open from the Home Screen → Settings → **Send a test notification**.
3. Write something, force-quit the app mid-sentence, reopen: the text is there.

### 4. Restore drill (P0 gate: “a test restore passes”)
Settings → **Download backup** → save to Files. Delete the Home Screen app, reinstall, Settings → **Restore from file**. Every entry and version comes back; with sync on, the server is reconciled without conflicts.

## How data is kept safe
- Every keystroke goes to a synchronous crash buffer and, 300 ms later, to IndexedDB; on launch anything newer in the buffer is saved back.
- Revisions are append-only, locally and on the server (no update/delete policies, plus triggers that block even admin edits).
- Sync never lets the last writer win: if two devices diverge, both versions are kept and the entry is flagged for you to choose.
- Restore only adds missing data; it never overwrites.
