import type { Entry, JournalDB, Revision } from '../db/schema';
import type { Remote, RemoteEntry, RemoteEntryMeta, RemoteRevision } from './remote';

/**
 * Write locally, push to the server, pull other devices' changes.
 * Text is never overwritten by the last writer: divergent heads are kept and
 * flagged as a conflict for you to resolve.
 */

export interface SyncReport {
  pushed: number;
  pulled: number;
  conflicts: number;
}

const PULL_OVERLAP_MS = 60_000;

const running = new WeakMap<JournalDB, Promise<SyncReport>>();

/** Single-flight per database: concurrent callers share one run. */
export function syncOnce(db: JournalDB, remote: Remote): Promise<SyncReport> {
  let p = running.get(db);
  if (!p) {
    p = run(db, remote).finally(() => running.delete(db));
    running.set(db, p);
  }
  return p;
}

async function run(db: JournalDB, remote: Remote): Promise<SyncReport> {
  const report: SyncReport = { pushed: 0, pulled: 0, conflicts: 0 };
  await push(db, remote, report);
  await pull(db, remote, report);
  await db.meta.put({ key: 'lastSyncAt', value: Date.now() });
  return report;
}

function toMeta(e: Entry): RemoteEntryMeta {
  return {
    id: e.id,
    createdAt: e.createdAt,
    originalDate: e.originalDate,
    kind: e.kind,
    source: e.source,
    isPrivate: e.isPrivate,
    promptId: e.promptId,
    sessionId: e.sessionId,
    deletedAt: e.deletedAt,
    titleSource: e.titleSource,
  };
}

function toRemoteRev(r: Revision): RemoteRevision {
  const { sealed: _s, synced: _y, ...rest } = r;
  return rest;
}

function fromRemoteRev(r: RemoteRevision): Revision {
  return { ...r, sealed: 1, synced: 1 };
}

async function push(db: JournalDB, remote: Remote, report: SyncReport): Promise<void> {
  const dirty = await db.entries.where('dirty').equals(1).primaryKeys();
  for (const id of dirty) {
    // Seal what we are about to send: from here on these revisions never change.
    const claim = await db.transaction('rw', db.entries, db.revisions, async () => {
      const entry = await db.entries.get(id);
      if (!entry || !entry.dirty || entry.conflict) return null;
      const revs = await db.revisions
        .where('entryId')
        .equals(id)
        .filter((r) => r.synced === 0)
        .toArray();
      const toSeal = revs.filter((r) => !r.sealed).map((r) => ({ key: r.id, changes: { sealed: 1 as const } }));
      if (toSeal.length) await db.revisions.bulkUpdate(toSeal);
      return { entry, revs };
    });
    if (!claim) continue;
    const { entry, revs } = claim;

    const res = await remote.pushEntry(toMeta(entry), revs.map(toRemoteRev), entry.headRevisionId);
    const theirs = res.status === 'conflict' && res.serverHead ? await remote.getRevision(res.serverHead) : null;

    await db.transaction('rw', db.entries, db.revisions, async () => {
      if (revs.length) await db.revisions.bulkUpdate(revs.map((r) => ({ key: r.id, changes: { synced: 1 as const } })));
      const cur = await db.entries.get(id);
      if (!cur) return;
      if (res.status === 'ok') {
        const unchanged = cur.headRevisionId === entry.headRevisionId && cur.updatedAt === entry.updatedAt;
        await db.entries.update(id, { baseRevisionId: res.serverHead, dirty: unchanged ? 0 : 1 });
        report.pushed++;
      } else if (res.serverHead) {
        if (theirs && !(await db.revisions.get(theirs.id))) await db.revisions.add(fromRemoteRev(theirs));
        await db.entries.update(id, { conflict: { theirRevisionId: res.serverHead, detectedAt: Date.now() } });
        report.conflicts++;
      }
    });
  }
}

async function pull(db: JournalDB, remote: Remote, report: SyncReport): Promise<void> {
  const stored = (await db.meta.get('pullCursor'))?.value;
  const cursor = typeof stored === 'number' ? stored : 0;
  // Overlap guards against server rows committed slightly out of clock order; applying twice is a no-op.
  const { entries, heads, cursor: next } = await remote.pull(Math.max(0, cursor - PULL_OVERLAP_MS));
  const headMap = new Map(heads.map((h) => [h.id, h]));
  for (const re of entries) {
    const head = re.headRevisionId ? headMap.get(re.headRevisionId) : undefined;
    const outcome = await applyRemote(db, re, head);
    if (outcome === 'updated') report.pulled++;
    if (outcome === 'conflict') report.conflicts++;
  }
  await db.meta.put({ key: 'pullCursor', value: Math.max(cursor, next) });
}

type Outcome = 'none' | 'updated' | 'conflict';

async function applyRemote(db: JournalDB, re: RemoteEntry, head: RemoteRevision | undefined): Promise<Outcome> {
  return db.transaction('rw', db.entries, db.revisions, async (): Promise<Outcome> => {
    if (head && !(await db.revisions.get(head.id))) await db.revisions.add(fromRemoteRev(head));
    const serverHead = re.headRevisionId;
    const local = await db.entries.get(re.id);
    const { updatedAt: _u, headRevisionId: _h, ...meta } = re;

    if (!local) {
      await db.entries.add({
        ...meta,
        updatedAt: Date.now(),
        title: head?.title ?? '',
        body: head?.body ?? '',
        headRevisionId: serverHead,
        baseRevisionId: serverHead,
        dirty: 0,
        conflict: null,
      });
      return 'updated';
    }

    const localMeta = local.dirty ? {} : meta;

    if (serverHead === local.headRevisionId || serverHead === local.baseRevisionId) {
      await db.entries.update(re.id, { ...localMeta, baseRevisionId: serverHead });
      return 'none';
    }
    if (serverHead && (await isAncestor(db, serverHead, local.headRevisionId))) {
      // We are ahead of the server; our next push fast-forwards it.
      await db.entries.update(re.id, { baseRevisionId: serverHead });
      return 'none';
    }
    const textClean = !local.dirty || (local.headRevisionId !== null && serverHead !== null && (await isAncestor(db, local.headRevisionId, serverHead)));
    if (textClean && head) {
      await db.entries.update(re.id, {
        ...localMeta,
        title: head.title,
        body: head.body,
        headRevisionId: serverHead,
        baseRevisionId: serverHead,
        updatedAt: Date.now(),
      });
      return 'updated';
    }
    if (serverHead && local.conflict?.theirRevisionId !== serverHead) {
      await db.entries.update(re.id, { conflict: { theirRevisionId: serverHead, detectedAt: Date.now() } });
      return 'conflict';
    }
    return 'none';
  });
}

/** True if `ancestor` is reachable from `from` through local parent links (or equal). */
export async function isAncestor(db: JournalDB, ancestor: string, from: string | null): Promise<boolean> {
  const seen = new Set<string>();
  const stack = from ? [from] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === ancestor) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const r = await db.revisions.get(id);
    if (r?.parentId) stack.push(r.parentId);
    if (r?.mergeParentId) stack.push(r.mergeParentId);
  }
  return false;
}
