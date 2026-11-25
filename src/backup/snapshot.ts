import type { Entry, JournalDB, Prompt, Revision, Session } from '../db/schema';

/**
 * Snapshot = the manual backup file and the nightly backup format (DATA-4, DATA-6).
 * Versioned so future readers can upgrade old files. Restore only adds what is
 * missing; it never overwrites anything already on the device.
 */

export const SNAPSHOT_FORMAT = 'journal-app-snapshot';
/** v2 adds prompts and sessions. v1 files (no prompts) still restore. */
export const SNAPSHOT_VERSION = 2;

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: number;
  exportedAt: string;
  entries: Entry[];
  revisions: Revision[];
  prompts?: Prompt[];
  sessions?: Session[];
}

export interface RestoreReport {
  entriesAdded: number;
  entriesSkipped: number;
  revisionsAdded: number;
  revisionsSkipped: number;
  promptsAdded: number;
  sessionsAdded: number;
}

export async function exportSnapshot(db: JournalDB, now = new Date()): Promise<Snapshot> {
  return db.transaction('r', [db.entries, db.revisions, db.prompts, db.sessions], async () => ({
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    exportedAt: now.toISOString(),
    entries: await db.entries.toArray(),
    revisions: await db.revisions.toArray(),
    prompts: await db.prompts.toArray(),
    sessions: await db.sessions.toArray(),
  }));
}

export function snapshotFileName(now = new Date()): string {
  return `journal-backup-${now.toISOString().slice(0, 10)}.json`;
}

/** Throws with a plain-English reason if the file is not a snapshot this app can read. */
export function parseSnapshot(raw: unknown): Snapshot {
  const s = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Partial<Snapshot> | null;
  if (!s || s.format !== SNAPSHOT_FORMAT) throw new Error('This file is not a journal backup.');
  if (typeof s.version !== 'number' || s.version > SNAPSHOT_VERSION) {
    throw new Error('This backup was made by a newer version of the app. Update the app, then restore.');
  }
  if (!Array.isArray(s.entries) || !Array.isArray(s.revisions)) throw new Error('This backup is incomplete.');
  if ((s.prompts !== undefined && !Array.isArray(s.prompts)) || (s.sessions !== undefined && !Array.isArray(s.sessions))) {
    throw new Error('This backup is incomplete.');
  }
  for (const p of s.prompts ?? []) {
    if (typeof p?.id !== 'string' || typeof p.text !== 'string') throw new Error('This backup contains a damaged prompt.');
  }
  for (const e of s.entries) {
    if (typeof e?.id !== 'string' || typeof e.body !== 'string') throw new Error('This backup contains a damaged entry.');
  }
  for (const r of s.revisions) {
    if (typeof r?.id !== 'string' || typeof r.entryId !== 'string' || typeof r.body !== 'string') {
      throw new Error('This backup contains a damaged revision.');
    }
  }
  return s as Snapshot;
}

export async function restoreSnapshot(db: JournalDB, input: unknown): Promise<RestoreReport> {
  const snap = parseSnapshot(input);
  const report: RestoreReport = { entriesAdded: 0, entriesSkipped: 0, revisionsAdded: 0, revisionsSkipped: 0, promptsAdded: 0, sessionsAdded: 0 };
  await db.transaction('rw', [db.entries, db.revisions, db.prompts, db.sessions], async () => {
    const haveP = new Set(await db.prompts.toCollection().primaryKeys());
    const prompts = (snap.prompts ?? []).filter((p) => !haveP.has(p.id));
    await db.prompts.bulkAdd(prompts);
    report.promptsAdded = prompts.length;
    const haveS = new Set(await db.sessions.toCollection().primaryKeys());
    const sessions = (snap.sessions ?? []).filter((x) => !haveS.has(x.id));
    await db.sessions.bulkAdd(sessions);
    report.sessionsAdded = sessions.length;

    const haveRevs = new Set(await db.revisions.toCollection().primaryKeys());
    const revs = snap.revisions
      .filter((r) => !haveRevs.has(r.id))
      // Not yet confirmed on this device's server: offer again (idempotent server-side).
      .map((r) => ({ ...r, sealed: 1 as const, synced: 0 as const }));
    await db.revisions.bulkAdd(revs);
    report.revisionsAdded = revs.length;
    report.revisionsSkipped = snap.revisions.length - revs.length;

    const haveEntries = new Set(await db.entries.toCollection().primaryKeys());
    const entries = snap.entries
      .filter((e) => !haveEntries.has(e.id))
      .map((e) => ({ ...e, baseRevisionId: null, dirty: 1 as const }));
    await db.entries.bulkAdd(entries);
    report.entriesAdded = entries.length;
    report.entriesSkipped = snap.entries.length - entries.length;
  });
  return report;
}
