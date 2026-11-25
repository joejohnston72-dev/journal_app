import type { JournalDB, Prompt, PromptSource, Session } from '../db/schema';
import { newId } from '../lib/id';
import { STARTER_PROMPTS } from './starter';

/**
 * Prompt library (PRM-1, PRM-3, PRM-4, PRM-6, PRM-7). Prompts are never deleted:
 * they move between statuses and keep their rating and feedback forever.
 */

export interface PromptInput {
  text: string;
  why?: string | null;
}

export function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const norm = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Accepts what Claude (or the user) pastes: a JSON array of strings or
 * {text, why} objects, or plain text with one prompt per line (bullets and
 * numbering are stripped; a line starting "Why:" attaches to the prompt above).
 */
export function parsePromptText(raw: string): PromptInput[] {
  const t = raw.trim();
  if (!t) return [];
  if (t.startsWith('[') || t.startsWith('{')) {
    const data = JSON.parse(t) as unknown;
    const arr = Array.isArray(data) ? data : (data as { prompts?: unknown }).prompts;
    if (!Array.isArray(arr)) throw new Error('Expected a list of prompts.');
    return arr
      .map((x): PromptInput | null => {
        if (typeof x === 'string') return { text: x.trim() };
        if (x && typeof x === 'object' && typeof (x as PromptInput).text === 'string') {
          const o = x as PromptInput;
          return { text: o.text.trim(), why: typeof o.why === 'string' ? o.why.trim() : null };
        }
        return null;
      })
      .filter((x): x is PromptInput => !!x && x.text.length > 0);
  }
  const out: PromptInput[] = [];
  for (const line of t.split(/\r?\n/)) {
    const l = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
    if (!l) continue;
    const why = /^why:\s*(.+)$/i.exec(l);
    if (why && out.length) out[out.length - 1]!.why = why[1]!.trim();
    else out.push({ text: l });
  }
  return out;
}

/** Adds prompts to the end of the queue. Add-only: an identical prompt already in the library is skipped. */
export async function importPrompts(
  db: JournalDB,
  items: PromptInput[],
  source: PromptSource,
  origin: string | null = null,
  now = Date.now(),
): Promise<{ added: number; skipped: number }> {
  return db.transaction('rw', db.prompts, async () => {
    const existing = await db.prompts.toArray();
    const have = new Set(existing.map((p) => norm(p.text)));
    let order = existing.reduce((m, p) => Math.max(m, p.order), 0);
    const rows: Prompt[] = [];
    for (const it of items) {
      const k = norm(it.text);
      if (!k || have.has(k)) continue;
      have.add(k);
      rows.push({
        id: newId(),
        text: it.text.trim(),
        why: it.why ?? null,
        source,
        origin,
        status: 'queued',
        order: ++order,
        createdAt: now,
        servedOn: null,
        answeredAt: null,
        skipCount: 0,
        rating: null,
        feedback: null,
      });
    }
    await db.prompts.bulkAdd(rows);
    return { added: rows.length, skipped: items.length - rows.length };
  });
}

/** The prompt for today. Picks the next queued one the first time it is asked each day. */
export async function todaysPrompt(db: JournalDB, d = new Date()): Promise<Prompt | null> {
  const day = localDay(d);
  return db.transaction('rw', db.prompts, async () => {
    const served = await db.prompts.where('servedOn').equals(day).filter((p) => p.status !== 'queued').first();
    if (served) return served;
    const next = await db.prompts.orderBy('order').filter((p) => p.status === 'queued').first();
    if (!next) return null;
    await db.prompts.update(next.id, { status: 'served', servedOn: day });
    return { ...next, status: 'served', servedOn: day };
  });
}

/** Offline fallback when the library is empty. */
export function fallbackPrompt(d = new Date()): string {
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return STARTER_PROMPTS[day % STARTER_PROMPTS.length]!;
}

/** PRM-6: one tap, no penalty. The prompt goes to the back of the queue and the next one is served. */
export async function skipPrompt(db: JournalDB, id: string, d = new Date()): Promise<Prompt | null> {
  await db.transaction('rw', db.prompts, async () => {
    const p = await db.prompts.get(id);
    if (!p) return;
    const last = await db.prompts.orderBy('order').last();
    await db.prompts.update(id, { status: 'queued', servedOn: null, skipCount: p.skipCount + 1, order: (last?.order ?? 0) + 1 });
  });
  return todaysPrompt(db, d);
}

export async function ratePrompt(db: JournalDB, id: string, rating: 1 | -1 | null, feedback?: string): Promise<void> {
  const patch: Partial<Prompt> = { rating };
  if (feedback !== undefined) patch.feedback = feedback.trim() || null;
  await db.prompts.update(id, patch);
}

export async function markAnswered(db: JournalDB, id: string, now = Date.now()): Promise<void> {
  await db.prompts.update(id, { status: 'answered', answeredAt: now });
}

export async function recordSession(
  db: JournalDB,
  s: { promptId: string | null; entryId: string | null; rating: number | null; note: string | null },
  now = Date.now(),
): Promise<Session> {
  const row: Session = { id: newId(), date: localDay(new Date(now)), createdAt: now, ...s, note: s.note?.trim() || null };
  await db.sessions.add(row);
  return row;
}

export async function queuedCount(db: JournalDB): Promise<number> {
  return db.prompts.where('status').equals('queued').count();
}

/**
 * Everything the prompt generator needs to write the next batch (see
 * prompts/generator/). Private entries are left out; entry text is trimmed.
 */
export async function exportFeedback(db: JournalDB, opts: { entries?: number; chars?: number } = {}) {
  const { entries: nEntries = 14, chars = 1200 } = opts;
  const prompts = await db.prompts.orderBy('order').toArray();
  const sessions = await db.sessions.orderBy('date').reverse().limit(60).toArray();
  const entries = (await db.entries.orderBy('originalDate').reverse().limit(nEntries * 3).toArray())
    .filter((e) => !e.deletedAt && !e.isPrivate && e.body.trim())
    .slice(0, nEntries);
  const byId = new Map(prompts.map((p) => [p.id, p]));
  return {
    format: 'journal-prompt-feedback',
    version: 1,
    exportedAt: new Date().toISOString(),
    queuedCount: prompts.filter((p) => p.status === 'queued').length,
    prompts: prompts
      .filter((p) => p.status !== 'queued' || p.rating !== null || p.skipCount > 0)
      .map((p) => ({ text: p.text, source: p.source, status: p.status, skips: p.skipCount, rating: p.rating, feedback: p.feedback })),
    upcoming: prompts.filter((p) => p.status === 'queued').map((p) => p.text),
    sessions: sessions.map((s) => ({ date: s.date, rating: s.rating, note: s.note, prompt: s.promptId ? byId.get(s.promptId)?.text ?? null : null })),
    recentEntries: entries.map((e) => ({
      date: e.originalDate.slice(0, 10),
      prompt: e.promptId ? byId.get(e.promptId)?.text ?? null : null,
      text: e.body.length > chars ? `${e.body.slice(0, chars)}…` : e.body,
    })),
  };
}
