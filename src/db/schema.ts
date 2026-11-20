import Dexie, { type EntityTable } from 'dexie';

/**
 * Local copy (IndexedDB via Dexie). Mirrors supabase/migrations so a native
 * app can sync to the same tables later. Booleans used in indexes are 0 | 1
 * because IndexedDB cannot index booleans.
 *
 * Never-lose rules (brief → Architecture):
 *  - entries are never hard-deleted; the bin is `deletedAt`.
 *  - revisions are append-only; a revision is frozen (`sealed`) once it has
 *    been offered to the server and is never changed after that.
 */

export type EntryKind = 'text' | 'quick' | 'voice' | 'photo' | 'scan' | 'import';

export interface Conflict {
  /** Server head that diverged from ours. Both versions are kept. */
  theirRevisionId: string;
  detectedAt: number;
}

export interface Entry {
  id: string;
  createdAt: number;
  updatedAt: number;
  /** The day the entry is about; imports keep their original date. ISO string. */
  originalDate: string;
  title: string;
  titleSource: 'auto' | 'user';
  body: string;
  kind: EntryKind;
  source: string | null;
  isPrivate: boolean;
  promptId: string | null;
  sessionId: string | null;
  /** Set = in the bin. The bin never empties itself. */
  deletedAt: number | null;
  /** Latest local revision. */
  headRevisionId: string | null;
  /** Latest revision the server has confirmed as head. */
  baseRevisionId: string | null;
  /** 1 = has changes the server has not confirmed ("not backed up"). */
  dirty: 0 | 1;
  conflict: Conflict | null;
}

export interface Revision {
  id: string;
  entryId: string;
  parentId: string | null;
  /** Second parent, set when a conflict is resolved. */
  mergeParentId: string | null;
  title: string;
  body: string;
  /** When this revision was first written. */
  openedAt: number;
  /** Last write to this revision (only changes while unsealed). */
  savedAt: number;
  deviceId: string;
  /** 1 = has been offered to the server; content frozen forever. */
  sealed: 0 | 1;
  /** 1 = server confirmed it holds this revision. */
  synced: 0 | 1;
}

export interface Meta {
  key: string;
  value: unknown;
}

export class JournalDB extends Dexie {
  entries!: EntityTable<Entry, 'id'>;
  revisions!: EntityTable<Revision, 'id'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'journal') {
    super(name);
    // Schema changes: add a new version(n) block, never edit an old one.
    // Every upgrade must be preceded by a snapshot (see backup/snapshot.ts) and covered by a test.
    this.version(1).stores({
      entries: 'id, originalDate, updatedAt, dirty, deletedAt',
      revisions: 'id, entryId, [entryId+openedAt], synced',
      meta: 'key',
    });
  }
}

export const db = new JournalDB();
