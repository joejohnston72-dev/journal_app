import { describe, expect, it } from 'vitest';
import { createEntry } from '../src/db/entries';
import { exportSnapshot, restoreSnapshot } from '../src/backup/snapshot';
import {
  exportFeedback,
  importPrompts,
  markAnswered,
  parsePromptText,
  ratePrompt,
  recordSession,
  skipPrompt,
  todaysPrompt,
} from '../src/prompts/library';
import samples from '../src/prompts/generator/v1.samples.json';
import { freshDb } from './helpers';

const day1 = new Date(2026, 10, 25, 7);
const day2 = new Date(2026, 10, 26, 7);

describe('prompt library (PRM-1/3/4/6)', () => {
  it('parses lines, bullets, Why: lines and JSON', () => {
    expect(parsePromptText('1. First?\n- Second?\nWhy: because\n\n• Third?')).toEqual([
      { text: 'First?' },
      { text: 'Second?', why: 'because' },
      { text: 'Third?' },
    ]);
    expect(parsePromptText('[{"text":"A?","why":"w"},"B?"]')).toEqual([{ text: 'A?', why: 'w' }, { text: 'B?' }]);
  });

  it('generator v1 sample output imports cleanly', async () => {
    const db = freshDb();
    const r = await importPrompts(db, parsePromptText(JSON.stringify(samples.expectedOutput)), 'claude');
    expect(r.added).toBe(samples.expectedOutput.length);
  });

  it('import is add-only and skips duplicates', async () => {
    const db = freshDb();
    await importPrompts(db, [{ text: 'A?' }, { text: 'B?' }], 'reminders');
    const r = await importPrompts(db, [{ text: 'a? ' }, { text: 'C?' }], 'claude');
    expect(r).toEqual({ added: 1, skipped: 1 });
    expect(await db.prompts.count()).toBe(3);
  });

  it('serves one prompt per day in queue order and keeps it all day', async () => {
    const db = freshDb();
    await importPrompts(db, [{ text: 'A?' }, { text: 'B?' }], 'reminders');
    expect((await todaysPrompt(db, day1))?.text).toBe('A?');
    expect((await todaysPrompt(db, day1))?.text).toBe('A?');
    expect((await todaysPrompt(db, day2))?.text).toBe('B?');
  });

  it('skip sends the prompt to the back, counts it, and serves the next', async () => {
    const db = freshDb();
    await importPrompts(db, [{ text: 'A?' }, { text: 'B?' }], 'reminders');
    const a = (await todaysPrompt(db, day1))!;
    expect((await skipPrompt(db, a.id, day1))?.text).toBe('B?');
    const after = (await db.prompts.get(a.id))!;
    expect(after.status).toBe('queued');
    expect(after.skipCount).toBe(1);
  });

  it('ratings, notes and sessions are kept and exported for the generator; private entries are not', async () => {
    const db = freshDb();
    await importPrompts(db, [{ text: 'A?' }], 'reminders');
    const a = (await todaysPrompt(db, day1))!;
    await ratePrompt(db, a.id, 1, 'more like this');
    await markAnswered(db, a.id);
    await createEntry(db, { body: 'Public thought', promptId: a.id });
    await createEntry(db, { body: 'Secret', isPrivate: true });
    await recordSession(db, { promptId: a.id, entryId: null, rating: 4, note: 'flowed' });
    const fb = await exportFeedback(db);
    expect(fb.prompts[0]).toMatchObject({ text: 'A?', rating: 1, feedback: 'more like this', status: 'answered' });
    expect(fb.sessions[0]).toMatchObject({ rating: 4, note: 'flowed', prompt: 'A?' });
    expect(fb.recentEntries.map((e) => e.text)).toEqual(['Public thought']);
  });

  it('backups include prompts and sessions, and restore only adds', async () => {
    const phone = freshDb();
    await importPrompts(phone, [{ text: 'A?' }], 'reminders');
    await recordSession(phone, { promptId: null, entryId: null, rating: 3, note: null });
    const snap = await exportSnapshot(phone);
    const clean = freshDb();
    const r = await restoreSnapshot(clean, JSON.stringify(snap));
    expect([r.promptsAdded, r.sessionsAdded]).toEqual([1, 1]);
    const again = await restoreSnapshot(clean, snap);
    expect([again.promptsAdded, again.sessionsAdded]).toEqual([0, 0]);
  });

  it('still restores a v1 backup with no prompts', async () => {
    const db = freshDb();
    const r = await restoreSnapshot(db, { format: 'journal-app-snapshot', version: 1, exportedAt: '', entries: [], revisions: [] });
    expect(r.promptsAdded).toBe(0);
  });
});

describe('schema v1 → v2 upgrade (rule 2)', () => {
  it('backs up first, then upgrades without touching existing entries', async () => {
    const { default: Dexie } = await import('dexie');
    const { JournalDB } = await import('../src/db/schema');
    const { backupBeforeUpgrade } = await import('../src/db/preUpgrade');
    const name = `upgrade-${Date.now()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({ entries: 'id, originalDate, updatedAt, dirty, deletedAt', revisions: 'id, entryId, [entryId+openedAt], synced', meta: 'key' });
    await v1.table('entries').add({ id: 'e1', body: 'Before the upgrade', originalDate: '2026-11-01' });
    v1.close();

    const key = await backupBeforeUpgrade(name);
    expect(key).toMatch(/^from-v1-/);
    const store = new Dexie(`${name}-preupgrade`);
    store.version(1).stores({ snapshots: 'id' });
    const saved = await store.table('snapshots').get(key!);
    expect(saved.snapshot.entries[0].body).toBe('Before the upgrade');

    const db = new JournalDB(name);
    await db.open();
    expect((await db.entries.get('e1'))?.body).toBe('Before the upgrade');
    expect(await db.prompts.count()).toBe(0);
    db.close();
    expect(await backupBeforeUpgrade(name)).toBeNull();
  });
});

describe('private link import', () => {
  it('round-trips unicode prompts and imports add-only', async () => {
    const { encodeImportLink, importFromHash } = await import('../src/prompts/linkImport');
    const link = encodeImportLink('https://x/app/', [{ text: 'A £385 question?', why: 'day 38' }]);
    const db = freshDb();
    expect(await importFromHash(db, link.slice(link.indexOf('#')))).toEqual({ added: 1, skipped: 0 });
    expect(await importFromHash(db, link.slice(link.indexOf('#')))).toEqual({ added: 0, skipped: 1 });
    expect((await db.prompts.toArray())[0]).toMatchObject({ text: 'A £385 question?', why: 'day 38', source: 'reminders' });
    expect(await importFromHash(db, '#other')).toBeNull();
  });
});
