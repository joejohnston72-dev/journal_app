import type { JournalDB } from './schema';
import { createEntry, saveEntry } from './entries';

/**
 * Crash buffer (DATA-1). IndexedDB saves are debounced (~300 ms) and async, so
 * a kill inside that window could lose the last words. Every keystroke is also
 * written synchronously to localStorage; on launch, anything newer than the
 * database is saved back. Cleared once the database has the text.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

const PREFIX = 'journal.draft.';

interface Draft {
  /** Entry id; pre-generated for an entry not yet created. */
  entryId: string;
  body: string;
  at: number;
  promptId?: string | null;
}

export function bufferDraft(store: KeyValueStore, slot: string, draft: Draft): void {
  try {
    store.setItem(PREFIX + slot, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the IndexedDB save still runs.
  }
}

export function clearDraft(store: KeyValueStore, slot: string): void {
  try {
    store.removeItem(PREFIX + slot);
  } catch {
    /* ignore */
  }
}

/** Saves any buffered text the database does not have. Returns how many drafts were recovered. */
export async function recoverDrafts(db: JournalDB, store: KeyValueStore): Promise<number> {
  const slots: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k?.startsWith(PREFIX)) slots.push(k.slice(PREFIX.length));
  }
  let recovered = 0;
  for (const slot of slots) {
    let d: Draft;
    try {
      d = JSON.parse(store.getItem(PREFIX + slot) ?? 'null') as Draft;
    } catch {
      continue;
    }
    if (!d || typeof d.body !== 'string') continue;
    const existing = await db.entries.get(d.entryId);
    if (existing) {
      if (existing.body !== d.body && d.at >= existing.updatedAt) {
        await saveEntry(db, existing.id, { body: d.body }, d.at);
        recovered++;
      }
    } else if (d.body.trim()) {
      await createEntry(db, { id: d.entryId, body: d.body, promptId: d.promptId ?? null }, d.at);
      recovered++;
    }
    clearDraft(store, slot);
  }
  return recovered;
}
