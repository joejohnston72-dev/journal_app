import { describe, expect, it } from 'vitest';
import { createEntry, getHistory, moveToBin, restoreFromBin, saveEntry, REVISION_WINDOW_MS } from '../../src/db/entries';
import { bufferDraft, recoverDrafts } from '../../src/db/draftBuffer';
import { freshDb, MemoryStorage, relaunch } from '../helpers';

describe('DATA-1 zero-loss writing', () => {
  it('keeps every saved word across a force-quit', async () => {
    let db = freshDb();
    const e = await createEntry(db, { body: 'I woke before' });
    await saveEntry(db, e.id, { body: 'I woke before the alarm and sat with coffee' });
    db = await relaunch(db);
    expect((await db.entries.get(e.id))?.body).toBe('I woke before the alarm and sat with coffee');
  });

  it('recovers words typed inside the save debounce window', async () => {
    let db = freshDb();
    const store = new MemoryStorage();
    const e = await createEntry(db, { body: 'Half a sen' });
    // Keystrokes reach the crash buffer, then the app is killed before the debounced save.
    bufferDraft(store, 'today', { entryId: e.id, body: 'Half a sentence, then gone', at: Date.now() + 1 });
    db = await relaunch(db);
    expect(await recoverDrafts(db, store)).toBe(1);
    expect((await db.entries.get(e.id))?.body).toBe('Half a sentence, then gone');
    expect(store.length).toBe(0);
  });

  it('recovers a brand-new entry killed before its first save, without duplicating it', async () => {
    let db = freshDb();
    const store = new MemoryStorage();
    bufferDraft(store, 'today', { entryId: 'pre-generated-id', body: 'First words', at: Date.now() });
    db = await relaunch(db);
    await recoverDrafts(db, store);
    await recoverDrafts(db, store);
    expect(await db.entries.count()).toBe(1);
    expect((await db.entries.get('pre-generated-id'))?.body).toBe('First words');
  });

  it('does not let a stale buffer overwrite newer text', async () => {
    const db = freshDb();
    const store = new MemoryStorage();
    const e = await createEntry(db, { body: 'old' }, 1000);
    await saveEntry(db, e.id, { body: 'newer' }, 5000);
    bufferDraft(store, 's', { entryId: e.id, body: 'stale', at: 2000 });
    await recoverDrafts(db, store);
    expect((await db.entries.get(e.id))?.body).toBe('newer');
  });
});

describe('DATA-2 revision history and bin', () => {
  it('versions edits; checkpoints at most once a window while typing', async () => {
    const db = freshDb();
    const t = 1_000_000;
    const e = await createEntry(db, { body: 'a' }, t);
    await saveEntry(db, e.id, { body: 'ab' }, t + 300);
    await saveEntry(db, e.id, { body: 'abc' }, t + 600);
    expect(await getHistory(db, e.id)).toHaveLength(1);
    await saveEntry(db, e.id, { body: 'abcd' }, t + REVISION_WINDOW_MS + 1);
    const h = await getHistory(db, e.id);
    expect(h.map((r) => r.body)).toEqual(['abc', 'abcd']);
    expect(h[1]!.parentId).toBe(h[0]!.id);
  });

  it('never changes a sealed revision', async () => {
    const db = freshDb();
    const t = 2_000_000;
    const e = await createEntry(db, { body: 'sent to server' }, t);
    await db.revisions.update(e.headRevisionId!, { sealed: 1 });
    await saveEntry(db, e.id, { body: 'sent to server, then more' }, t + 10);
    const h = await getHistory(db, e.id);
    expect(h.map((r) => r.body)).toEqual(['sent to server', 'sent to server, then more']);
  });

  it('deletes go to a restorable bin; nothing is removed', async () => {
    const db = freshDb();
    const e = await createEntry(db, { body: 'keep me' });
    await moveToBin(db, e.id);
    expect((await db.entries.get(e.id))?.deletedAt).not.toBeNull();
    expect(await db.revisions.where('entryId').equals(e.id).count()).toBe(1);
    await restoreFromBin(db, e.id);
    expect((await db.entries.get(e.id))?.deletedAt).toBeNull();
    expect((await db.entries.get(e.id))?.body).toBe('keep me');
  });
});
