import type { EntryKind } from '../db/schema';

/**
 * The server contract. `MemoryRemote` below is the executable spec;
 * `push_entry` in supabase/migrations implements the same rules in SQL.
 *
 * Rules:
 *  - Revisions are insert-only and idempotent by id (retries never duplicate).
 *  - The head only moves forward: a push is accepted when the server head is
 *    empty or an ancestor of (or equal to) the pushed head. Otherwise the
 *    server reports a conflict and changes nothing but the inserted revisions.
 */

export interface RemoteEntryMeta {
  id: string;
  createdAt: number;
  originalDate: string;
  kind: EntryKind;
  source: string | null;
  isPrivate: boolean;
  promptId: string | null;
  sessionId: string | null;
  deletedAt: number | null;
  titleSource: 'auto' | 'user';
}

export interface RemoteEntry extends RemoteEntryMeta {
  headRevisionId: string | null;
  /** Server clock; used as the pull cursor. */
  updatedAt: number;
}

export interface RemoteRevision {
  id: string;
  entryId: string;
  parentId: string | null;
  mergeParentId: string | null;
  title: string;
  body: string;
  openedAt: number;
  savedAt: number;
  deviceId: string;
}

export interface PushResult {
  status: 'ok' | 'conflict';
  serverHead: string | null;
}

export interface PullResult {
  entries: RemoteEntry[];
  /** Head revisions of the returned entries. */
  heads: RemoteRevision[];
  cursor: number;
}

export interface Remote {
  pushEntry(meta: RemoteEntryMeta, revisions: RemoteRevision[], newHead: string | null): Promise<PushResult>;
  pull(since: number): Promise<PullResult>;
  getRevision(id: string): Promise<RemoteRevision | null>;
}

export class NetworkError extends Error {
  constructor(message = 'Network unavailable') {
    super(message);
    this.name = 'NetworkError';
  }
}

const clone = <T>(v: T): T => structuredClone(v);

/** In-memory server for tests and offline spikes. */
export class MemoryRemote implements Remote {
  entries = new Map<string, RemoteEntry>();
  revisions = new Map<string, RemoteRevision>();
  /** Simulate airplane mode. */
  offline = false;
  /** Apply the next N pushes on the server but lose the response. */
  dropResponses = 0;
  private clock = 0;

  private now(): number {
    this.clock = Math.max(this.clock + 1, Date.now());
    return this.clock;
  }

  private isAncestor(ancestor: string, from: string | null): boolean {
    const seen = new Set<string>();
    const stack = from ? [from] : [];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === ancestor) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      const r = this.revisions.get(id);
      if (r?.parentId) stack.push(r.parentId);
      if (r?.mergeParentId) stack.push(r.mergeParentId);
    }
    return false;
  }

  async pushEntry(meta: RemoteEntryMeta, revisions: RemoteRevision[], newHead: string | null): Promise<PushResult> {
    if (this.offline) throw new NetworkError();
    let entry = this.entries.get(meta.id);
    if (!entry) {
      entry = { ...clone(meta), headRevisionId: null, updatedAt: this.now() };
      this.entries.set(meta.id, entry);
    }
    for (const r of revisions) {
      if (r.entryId !== meta.id) throw new Error('Revision belongs to another entry');
      if (!this.revisions.has(r.id)) this.revisions.set(r.id, clone(r));
    }
    const serverHead = entry.headRevisionId;
    const forward = serverHead === null || serverHead === newHead || this.isAncestor(serverHead, newHead);
    let result: PushResult;
    if (forward) {
      Object.assign(entry, clone(meta), { headRevisionId: newHead ?? serverHead, updatedAt: this.now() });
      result = { status: 'ok', serverHead: entry.headRevisionId };
    } else {
      result = { status: 'conflict', serverHead };
    }
    if (this.dropResponses > 0) {
      this.dropResponses--;
      throw new NetworkError('Response lost');
    }
    return result;
  }

  async pull(since: number): Promise<PullResult> {
    if (this.offline) throw new NetworkError();
    const entries = [...this.entries.values()].filter((e) => e.updatedAt > since).sort((a, b) => a.updatedAt - b.updatedAt);
    const heads = entries.flatMap((e) => (e.headRevisionId ? [this.revisions.get(e.headRevisionId)!] : []));
    const cursor = entries.reduce((m, e) => Math.max(m, e.updatedAt), since);
    return { entries: clone(entries), heads: clone(heads), cursor };
  }

  async getRevision(id: string): Promise<RemoteRevision | null> {
    if (this.offline) throw new NetworkError();
    const r = this.revisions.get(id);
    return r ? clone(r) : null;
  }
}
