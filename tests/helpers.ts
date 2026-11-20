import { JournalDB } from '../src/db/schema';
import type { KeyValueStore } from '../src/db/draftBuffer';

let n = 0;
export function freshDb(name = `test-${Date.now()}-${n++}`): JournalDB {
  return new JournalDB(name);
}

/** Simulates a force-quit: drop the connection, open a new one on the same data. */
export async function relaunch(db: JournalDB): Promise<JournalDB> {
  db.close();
  const next = new JournalDB(db.name);
  await next.open();
  return next;
}

export class MemoryStorage implements KeyValueStore {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
