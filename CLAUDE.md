# Journal App — rules for Claude Code

Scope and requirement IDs (CAP-1, DATA-1, PRM-1 …): `docs/brief.md`. Current phase: **P0 Foundations → P1 Core journal**.
Owner is fairly technical, not a developer: explain changes in plain English.

## Rules (from the brief)
1. TypeScript, React, Vite, Dexie and Supabase only. **No other packages without asking first.** (Dev/test: vitest, fake-indexeddb.)
2. **Never delete or overwrite user data.** Every migration ships with a backup step and a test.
3. One feature per branch; every change builds, runs and has tests.
4. Explain each change in plain English in the pull request, citing requirement IDs.
5. AI prompts live as versioned files, with sample inputs and expected outputs.
6. Model IDs and token budgets live in one config file.
7. The Claude API key lives only in server secrets (Supabase), never in front-end code. Anything `VITE_*` ships to the browser.

## Never-lose invariants (do not weaken; the safety suite enforces them)
- Save to IndexedDB on every keystroke (debounced 300 ms) **and** to the localStorage crash buffer synchronously (`src/db/draftBuffer.ts`).
- Entries are never hard-deleted: bin = `deletedAt`. There is no hard-delete function; don't add one. Emptying the bin will need a passkey check (P1).
- Revisions are append-only. An unsealed revision may absorb saves for up to 60 s (`REVISION_WINDOW_MS`); once offered to the server it is `sealed` and never changes.
- Sync never picks a winner for text: the server head only moves forward (ancestor check); divergence is flagged as a conflict and both versions are kept. `MemoryRemote` (`src/sync/remote.ts`) is the executable spec; `push_entry` in SQL must match it.
- Restore only adds missing rows; it never overwrites.
- Dexie schema: add `version(n+1)`, never edit an old version. Supabase: add a new migration file, never edit an applied one.
- Any entry not confirmed by the server shows "not backed up".

## Layout
- `src/db/` local store (Dexie): `schema.ts`, `entries.ts`, `draftBuffer.ts`
- `src/sync/` `engine.ts` (push/pull), `remote.ts` (contract + in-memory server), `supabaseRemote.ts`, `controller.ts` (when to sync)
- `src/backup/snapshot.ts` backup file format + restore
- `src/ui/` screens; `src/styles/tokens.css` design tokens (calm rules in brief → Experience design)
- `src/sw.js` service worker (offline shell + push), built by the plugin in `vite.config.ts`
- `supabase/migrations/` schema + RLS + `push_entry`; `supabase/tests/` SQL safety tests
- `tests/safety/` data-safety suite (must pass to merge)

## Commands
- `npm run dev` · `npm run build` · `npm run typecheck`
- `npm test` (all) · `npm run test:safety`
- `./scripts/test-sql.sh` (needs Postgres; CI runs it)

## Calm UI rules
No badges, red dots, confetti, streak flames, infinite scroll or feeds. One primary action per screen. 300–500 ms ease-in-out motion, Reduce Motion honoured. Dark morning theme first. Serif for writing, system sans for UI. AI waits to be asked while the user writes. Copy never guilt-trips. Every screen works offline.
