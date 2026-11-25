import type { Entry, EntryKind, JournalDB, Revision } from './schema';
import { newId } from '../lib/id';
import { notifyLocalChange } from '../sync/signal';
import { isDividerLine } from '../lib/sessions';

/** While typing, one unsealed revision absorbs saves for up to this long, then a new one starts. */
export const REVISION_WINDOW_MS = 60_000;

export async function getDeviceId(db: JournalDB): Promise<string> {
  return db.transaction('rw', db.meta, async () => {
    const row = await db.meta.get('deviceId');
    if (typeof row?.value === 'string') return row.value;
    const id = newId();
    await db.meta.put({ key: 'deviceId', value: id });
    return id;
  });
}

export interface NewEntry {
  /** Pre-generated id, so a crash buffer can refer to an entry before it exists. */
  id?: string;
  body?: string;
  title?: string;
  kind?: EntryKind;
  originalDate?: string;
  source?: string | null;
  promptId?: string | null;
  sessionId?: string | null;
  isPrivate?: boolean;
}

/** Creates an entry. Callers create it on the first keystroke so empty entries never exist. */
export async function createEntry(db: JournalDB, init: NewEntry = {}, now = Date.now()): Promise<Entry> {
  const deviceId = await getDeviceId(db);
  const entry: Entry = {
    id: init.id ?? newId(),
    createdAt: now,
    updatedAt: now,
    originalDate: init.originalDate ?? new Date(now).toISOString(),
    title: init.title ?? '',
    titleSource: init.title ? 'user' : 'auto',
    body: init.body ?? '',
    kind: init.kind ?? 'text',
    source: init.source ?? null,
    isPrivate: init.isPrivate ?? false,
    promptId: init.promptId ?? null,
    sessionId: init.sessionId ?? null,
    deletedAt: null,
    headRevisionId: null,
    baseRevisionId: null,
    dirty: 1,
    conflict: null,
  };
  await db.transaction('rw', db.entries, db.revisions, async () => {
    if (entry.body || entry.title) {
      const rev = newRevision(entry, null, deviceId, now);
      await db.revisions.add(rev);
      entry.headRevisionId = rev.id;
    }
    await db.entries.add(entry);
  });
  notifyLocalChange();
  return entry;
}

function newRevision(
  e: Pick<Entry, 'id' | 'title' | 'body'>,
  parentId: string | null,
  deviceId: string,
  now: number,
  mergeParentId: string | null = null,
): Revision {
  return {
    id: newId(),
    entryId: e.id,
    parentId,
    mergeParentId,
    title: e.title,
    body: e.body,
    openedAt: now,
    savedAt: now,
    deviceId,
    sealed: 0,
    synced: 0,
  };
}

/**
 * Saves text. Writes the entry and its history in one transaction, so a kill
 * mid-save leaves either the old or the new state, never a half state.
 */
export async function saveEntry(
  db: JournalDB,
  id: string,
  patch: { body?: string; title?: string },
  now = Date.now(),
): Promise<Entry> {
  const deviceId = await getDeviceId(db);
  const saved = await db.transaction('rw', db.entries, db.revisions, async () => {
    const entry = await db.entries.get(id);
    if (!entry) throw new Error(`Entry ${id} not found`);
    const next: Entry = { ...entry };
    if (patch.body !== undefined) next.body = patch.body;
    if (patch.title !== undefined) {
      next.title = patch.title;
      next.titleSource = 'user';
    }
    if (next.body === entry.body && next.title === entry.title && next.titleSource === entry.titleSource) {
      return entry;
    }

    const head = entry.headRevisionId ? await db.revisions.get(entry.headRevisionId) : undefined;
    const canAmend =
      head && !head.sealed && head.deviceId === deviceId && now - head.openedAt < REVISION_WINDOW_MS;

    if (head && canAmend) {
      await db.revisions.update(head.id, { title: next.title, body: next.body, savedAt: now });
    } else {
      const rev = newRevision(next, entry.headRevisionId, deviceId, now);
      await db.revisions.add(rev);
      next.headRevisionId = rev.id;
    }
    next.updatedAt = now;
    next.dirty = 1;
    await db.entries.put(next);
    return next;
  });
  notifyLocalChange();
  return saved;
}

/** Bin, not delete. There is deliberately no hard-delete function. */
export async function moveToBin(db: JournalDB, id: string, now = Date.now()): Promise<void> {
  await db.entries.update(id, { deletedAt: now, updatedAt: now, dirty: 1 });
  notifyLocalChange();
}

export async function restoreFromBin(db: JournalDB, id: string, now = Date.now()): Promise<void> {
  await db.entries.update(id, { deletedAt: null, updatedAt: now, dirty: 1 });
  notifyLocalChange();
}

export async function getHistory(db: JournalDB, entryId: string): Promise<Revision[]> {
  return db.revisions.where('[entryId+openedAt]').between([entryId, -Infinity], [entryId, Infinity]).toArray();
}

/**
 * Resolves a sync conflict by writing a new revision whose parents are both
 * versions. Neither version is lost: both stay in history.
 */
export async function resolveConflict(
  db: JournalDB,
  id: string,
  resolved: { body: string; title?: string },
  now = Date.now(),
): Promise<Entry> {
  const deviceId = await getDeviceId(db);
  const out = await db.transaction('rw', db.entries, db.revisions, async () => {
    const entry = await db.entries.get(id);
    if (!entry?.conflict) throw new Error('No conflict to resolve');
    const next: Entry = {
      ...entry,
      body: resolved.body,
      title: resolved.title ?? entry.title,
      updatedAt: now,
      dirty: 1,
      conflict: null,
    };
    const rev = newRevision(next, entry.headRevisionId, deviceId, now, entry.conflict.theirRevisionId);
    await db.revisions.add(rev);
    next.headRevisionId = rev.id;
    await db.entries.put(next);
    return next;
  });
  notifyLocalChange();
  return out;
}

/** Title shown in lists: the user's/auto title, else the first line. */
export function displayTitle(e: Pick<Entry, 'title' | 'body'>): string {
  if (e.title.trim()) return e.title.trim();
  const first = e.body.split('\n').find((l) => l.trim() && !isDividerLine(l));
  if (!first) return 'Untitled';
  return first.length > 60 ? `${first.slice(0, 57).trimEnd()}…` : first.trim();
}

/** Today's written entry (one per day: prompt answers and quick thoughts share it). */
export async function findTodaysEntry(db: JournalDB, now = new Date()): Promise<Entry | undefined> {
  const recent = await db.entries.orderBy('originalDate').reverse().limit(20).toArray();
  return recent.find((e) => {
    const d = new Date(e.originalDate);
    return (
      !e.deletedAt &&
      e.kind === 'text' &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });
}
