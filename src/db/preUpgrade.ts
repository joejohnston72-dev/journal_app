import Dexie from 'dexie';
import { SNAPSHOT_FORMAT } from '../backup/snapshot';

/** Must equal the highest version(n) in schema.ts. */
export const SCHEMA_VERSION = 2;

/**
 * Rule 2: before the local schema is upgraded, copy everything into a separate
 * database (`<name>-preupgrade`) as a restorable snapshot. Runs before db.open().
 * Returns the snapshot key, or null when no upgrade is pending.
 */
export async function backupBeforeUpgrade(name = 'journal', target = SCHEMA_VERSION, now = new Date()): Promise<string | null> {
  if (!(await Dexie.exists(name))) return null;
  const probe = new Dexie(name);
  await probe.open(); // no versions declared = opens the existing schema as is
  try {
    if (probe.verno >= target) return null;
    const tables = probe.tables.map((t) => t.name);
    const read = (t: string) => (tables.includes(t) ? probe.table(t).toArray() : Promise.resolve([]));
    const snapshot = {
      format: SNAPSHOT_FORMAT,
      version: 1,
      exportedAt: now.toISOString(),
      entries: await read('entries'),
      revisions: await read('revisions'),
    };
    const store = new Dexie(`${name}-preupgrade`);
    store.version(1).stores({ snapshots: 'id' });
    const id = `from-v${probe.verno}-${now.getTime()}`;
    await store.table('snapshots').put({ id, fromVersion: probe.verno, snapshot });
    store.close();
    return id;
  } finally {
    probe.close();
  }
}
