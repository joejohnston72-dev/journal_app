import { describe, expect, it } from 'vitest';
import { createEntry, saveEntry } from '../../src/db/entries';
import { exportSnapshot, parseSnapshot, restoreSnapshot } from '../../src/backup/snapshot';
import { syncOnce } from '../../src/sync/engine';
import { MemoryRemote } from '../../src/sync/remote';
import { freshDb } from '../helpers';

describe('DATA-6 tested restore', () => {
  it('restores a snapshot onto a clean install, word for word', async () => {
    const phone = freshDb();
    const a = await createEntry(phone, { body: 'Morning one' });
    await saveEntry(phone, a.id, { body: 'Morning one, revised' }, Date.now() + 120_000);
    await createEntry(phone, { body: 'Morning two', originalDate: '2019-03-01T07:00:00.000Z', kind: 'import' });

    const file = JSON.stringify(await exportSnapshot(phone));
    const clean = freshDb();
    const report = await restoreSnapshot(clean, file);
    expect(report.entriesAdded).toBe(2);
    expect(report.revisionsAdded).toBe(3);

    const pick = (e: { id: string; body: string; originalDate: string; headRevisionId: string | null }) => [e.id, e.body, e.originalDate, e.headRevisionId];
    expect((await clean.entries.toArray()).map(pick).sort()).toEqual((await phone.entries.toArray()).map(pick).sort());
    expect((await clean.revisions.toArray()).map((r) => r.body).sort()).toEqual((await phone.revisions.toArray()).map((r) => r.body).sort());
  });

  it('never overwrites what is already on the device', async () => {
    const db = freshDb();
    const e = await createEntry(db, { body: 'Original' });
    const snap = await exportSnapshot(db);
    await saveEntry(db, e.id, { body: 'Edited after backup' }, Date.now() + 120_000);
    const report = await restoreSnapshot(db, snap);
    expect(report.entriesAdded).toBe(0);
    expect((await db.entries.get(e.id))?.body).toBe('Edited after backup');
  });

  it('rejects files that are not backups', () => {
    expect(() => parseSnapshot('{"hello":1}')).toThrow(/not a journal backup/);
    expect(() => parseSnapshot({ format: 'journal-app-snapshot', version: 99, entries: [], revisions: [] })).toThrow(/newer version/);
  });

  it('server lost: restore from the file, and the server is rebuilt by sync', async () => {
    const phone = freshDb();
    const old = new MemoryRemote();
    const e = await createEntry(phone, { body: 'Survives everything' });
    await syncOnce(phone, old);
    const snap = await exportSnapshot(phone);

    const newPhone = freshDb();
    const newServer = new MemoryRemote();
    await restoreSnapshot(newPhone, snap);
    await syncOnce(newPhone, newServer);
    const head = newServer.entries.get(e.id)?.headRevisionId;
    expect(head && newServer.revisions.get(head)?.body).toBe('Survives everything');
  });

  it('restore onto a device whose server still has the data does not raise false conflicts', async () => {
    const phone = freshDb();
    const server = new MemoryRemote();
    await createEntry(phone, { body: 'Already backed up' });
    await syncOnce(phone, server);
    const snap = await exportSnapshot(phone);

    const reinstall = freshDb();
    await restoreSnapshot(reinstall, snap);
    const r = await syncOnce(reinstall, server);
    expect(r.conflicts).toBe(0);
    expect(await reinstall.entries.where('dirty').equals(1).count()).toBe(0);
  });
});
