import type { SupabaseClient } from '@supabase/supabase-js';
import { NetworkError, type PullResult, type PushResult, type Remote, type RemoteEntry, type RemoteEntryMeta, type RemoteRevision } from './remote';

/** Supabase implementation of the sync contract (see push_entry in supabase/migrations). */

const PAGE = 500;
const ms = (iso: string | null): number | null => (iso ? Date.parse(iso) : null);
const iso = (n: number | null): string | null => (n === null ? null : new Date(n).toISOString());

interface EntryRow {
  id: string;
  created_at: string;
  updated_at: string;
  original_date: string;
  kind: RemoteEntry['kind'];
  source: string | null;
  is_private: boolean;
  prompt_id: string | null;
  session_id: string | null;
  deleted_at: string | null;
  title_source: 'auto' | 'user';
  head_revision_id: string | null;
}

interface RevisionRow {
  id: string;
  entry_id: string;
  parent_id: string | null;
  merge_parent_id: string | null;
  title: string;
  body: string;
  opened_at: string;
  saved_at: string;
  device_id: string;
}

function entryFromRow(r: EntryRow): RemoteEntry {
  return {
    id: r.id,
    createdAt: ms(r.created_at)!,
    updatedAt: ms(r.updated_at)!,
    originalDate: r.original_date,
    kind: r.kind,
    source: r.source,
    isPrivate: r.is_private,
    promptId: r.prompt_id,
    sessionId: r.session_id,
    deletedAt: ms(r.deleted_at),
    titleSource: r.title_source,
    headRevisionId: r.head_revision_id,
  };
}

function revFromRow(r: RevisionRow): RemoteRevision {
  return {
    id: r.id,
    entryId: r.entry_id,
    parentId: r.parent_id,
    mergeParentId: r.merge_parent_id,
    title: r.title,
    body: r.body,
    openedAt: ms(r.opened_at)!,
    savedAt: ms(r.saved_at)!,
    deviceId: r.device_id,
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) {
    if (/fetch|network|Failed to/i.test(res.error.message)) throw new NetworkError(res.error.message);
    throw new Error(res.error.message);
  }
  return res.data;
}

export class SupabaseRemote implements Remote {
  constructor(private sb: SupabaseClient) {}

  async pushEntry(meta: RemoteEntryMeta, revisions: RemoteRevision[], newHead: string | null): Promise<PushResult> {
    const data = check(
      await this.sb.rpc('push_entry', {
        p_entry: {
          id: meta.id,
          created_at: iso(meta.createdAt),
          original_date: meta.originalDate,
          kind: meta.kind,
          source: meta.source,
          is_private: meta.isPrivate,
          prompt_id: meta.promptId,
          session_id: meta.sessionId,
          deleted_at: iso(meta.deletedAt),
          title_source: meta.titleSource,
        },
        p_revisions: revisions.map((r) => ({
          id: r.id,
          parent_id: r.parentId,
          merge_parent_id: r.mergeParentId,
          title: r.title,
          body: r.body,
          opened_at: iso(r.openedAt),
          saved_at: iso(r.savedAt),
          device_id: r.deviceId,
        })),
        p_new_head: newHead,
      }),
    ) as { status: 'ok' | 'conflict'; server_head: string | null };
    return { status: data.status, serverHead: data.server_head };
  }

  async pull(since: number): Promise<PullResult> {
    const entries: RemoteEntry[] = [];
    let after = iso(since)!;
    for (;;) {
      const rows = check(
        await this.sb.from('entries').select('*').gt('updated_at', after).order('updated_at').limit(PAGE),
      ) as EntryRow[];
      entries.push(...rows.map(entryFromRow));
      if (rows.length < PAGE) break;
      after = rows[rows.length - 1]!.updated_at;
    }
    const headIds = entries.flatMap((e) => (e.headRevisionId ? [e.headRevisionId] : []));
    const heads: RemoteRevision[] = [];
    for (let i = 0; i < headIds.length; i += 100) {
      const rows = check(await this.sb.from('revisions').select('*').in('id', headIds.slice(i, i + 100))) as RevisionRow[];
      heads.push(...rows.map(revFromRow));
    }
    const cursor = entries.reduce((m, e) => Math.max(m, e.updatedAt), since);
    return { entries, heads, cursor };
  }

  async getRevision(id: string): Promise<RemoteRevision | null> {
    const row = check(await this.sb.from('revisions').select('*').eq('id', id).maybeSingle()) as RevisionRow | null;
    return row ? revFromRow(row) : null;
  }
}
