import { describe, expect, it } from 'vitest';
import { createEntry, getHistory, moveToBin, resolveConflict, saveEntry } from '../../src/db/entries';
import { syncOnce } from '../../src/sync/engine';
import { MemoryRemote, NetworkError } from '../../src/sync/remote';
import { freshDb, relaunch } from '../helpers';

describe('DATA-3 sync', () => {
  it('writes offline for days, then syncs everything on reconnect', async () => {
    let phone = freshDb();
    const server = new MemoryRemote();
    server.offline = true;
    const a = await createEntry(phone, { body: 'Day one, airplane mode' });
    const b = await createEntry(phone, { body: 'Day two' });
    await saveEntry(phone, b.id, { body: 'Day two, still offline' });
    await expect(syncOnce(phone, server)).rejects.toBeInstanceOf(NetworkError);
    phone = await relaunch(phone);
    expect(await phone.entries.where('dirty').equals(1).count()).toBe(2);

    server.offline = false;
    await syncOnce(phone, server);
    expect(await phone.entries.where('dirty').equals(1).count()).toBe(0);
    expect(server.entries.get(a.id)?.headRevisionId).toBe((await phone.entries.get(a.id))?.headRevisionId);
    const head = server.entries.get(b.id)!.headRevisionId!;
    expect(server.revisions.get(head)?.body).toBe('Day two, still offline');
  });

  it('a lost response and retry never duplicates or loses anything', async () => {
    const phone = freshDb();
    const server = new MemoryRemote();
    const e = await createEntry(phone, { body: 'Once' });
    server.dropResponses = 1;
    await expect(syncOnce(phone, server)).rejects.toBeInstanceOf(NetworkError);
    await saveEntry(phone, e.id, { body: 'Once, and again' });
    await syncOnce(phone, server);
    expect(server.entries.size).toBe(1);
    expect(server.revisions.size).toBe(2);
    const head = server.entries.get(e.id)!.headRevisionId!;
    expect(server.revisions.get(head)?.body).toBe('Once, and again');
    expect((await phone.entries.get(e.id))?.dirty).toBe(0);
  });

  it('a second device receives entries and later edits', async () => {
    const phone = freshDb();
    const laptop = freshDb();
    const server = new MemoryRemote();
    const e = await createEntry(phone, { body: 'From the phone' });
    await syncOnce(phone, server);
    await syncOnce(laptop, server);
    expect((await laptop.entries.get(e.id))?.body).toBe('From the phone');

    await saveEntry(phone, e.id, { body: 'From the phone, edited' }, Date.now() + 120_000);
    await syncOnce(phone, server);
    await syncOnce(laptop, server);
    const l = await laptop.entries.get(e.id);
    expect(l?.body).toBe('From the phone, edited');
    expect(l?.dirty).toBe(0);
    expect(l?.conflict).toBeNull();
  });

  it('two-device conflict: both versions kept and flagged, never last-writer-wins', async () => {
    const phone = freshDb();
    const laptop = freshDb();
    const server = new MemoryRemote();
    const e = await createEntry(phone, { body: 'Shared start' });
    await syncOnce(phone, server);
    await syncOnce(laptop, server);

    const later = Date.now() + 120_000;
    await saveEntry(phone, e.id, { body: 'Phone version' }, later);
    await saveEntry(laptop, e.id, { body: 'Laptop version' }, later);
    await syncOnce(phone, server);
    const r = await syncOnce(laptop, server);
    expect(r.conflicts).toBe(1);

    const l = (await laptop.entries.get(e.id))!;
    expect(l.body).toBe('Laptop version'); // local text untouched
    expect(l.conflict).not.toBeNull();
    const theirs = await laptop.revisions.get(l.conflict!.theirRevisionId);
    expect(theirs?.body).toBe('Phone version'); // other version kept locally
    expect([...server.revisions.values()].map((x) => x.body)).toContain('Laptop version'); // and on the server
    const serverHead = server.entries.get(e.id)!.headRevisionId!;
    expect(server.revisions.get(serverHead)?.body).toBe('Phone version'); // server head not overwritten

    // Conflicted entries keep syncing their revisions but never move the head.
    await syncOnce(laptop, server);
    expect(server.entries.get(e.id)!.headRevisionId).toBe(serverHead);

    // Resolve: a merge revision with both parents; everyone converges.
    await resolveConflict(laptop, e.id, { body: 'Phone version\n\nLaptop version' });
    await syncOnce(laptop, server);
    await syncOnce(phone, server);
    expect((await phone.entries.get(e.id))?.body).toBe('Phone version\n\nLaptop version');
    expect((await laptop.entries.get(e.id))?.conflict).toBeNull();
    const bodies = (await getHistory(phone, e.id)).map((x) => x.body);
    expect(bodies).toEqual(expect.arrayContaining(['Phone version\n\nLaptop version']));
  });

  it('bin moves sync as metadata without touching text', async () => {
    const phone = freshDb();
    const laptop = freshDb();
    const server = new MemoryRemote();
    const e = await createEntry(phone, { body: 'Bin me' });
    await syncOnce(phone, server);
    await syncOnce(laptop, server);
    await moveToBin(phone, e.id);
    await syncOnce(phone, server);
    await syncOnce(laptop, server);
    const l = await laptop.entries.get(e.id);
    expect(l?.deletedAt).not.toBeNull();
    expect(l?.body).toBe('Bin me');
  });
});
