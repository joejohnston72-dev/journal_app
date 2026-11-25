import { describe, expect, it } from 'vitest';
import { createEntry, displayTitle, findTodaysEntry, getHistory, saveEntry } from '../src/db/entries';
import { divider, isDividerLine, joinSessions, splitSessions } from '../src/lib/sessions';
import { freshDb } from './helpers';

describe('writing sessions in one day (CAP-1)', () => {
  it('split/join never changes the text, whatever was typed', () => {
    const samples = [
      '',
      'one line',
      'a\n\n\nb\n',
      `morning${divider('7:02 am')}noon`,
      `\n${divider('9:00 am')}\n\nafter\n`,
      `a${divider('1:00 pm')}${divider('2:00 pm')}c`,
      '—— not a divider ——',
      `x\n\n—— ${'y'.repeat(60)} ——\n\nz`,
    ];
    for (let i = 0; i < 300; i++) {
      const bits = ['a', '\n', ' ', '—', '—— 3:14 pm ——', divider('8:15 am'), 'é'];
      samples.push(Array.from({ length: 12 }, () => bits[Math.floor(Math.random() * bits.length)]).join(''));
    }
    for (const s of samples) expect(joinSessions(splitSessions(s))).toBe(s);
  });

  it('splits sessions with their start time', () => {
    expect(splitSessions(`first${divider('2:14 pm')}second`)).toEqual([
      { label: null, text: 'first' },
      { label: '2:14 pm', text: 'second' },
    ]);
  });

  it('titles skip divider lines', () => {
    expect(isDividerLine('—— 2:14 pm ——')).toBe(true);
    expect(displayTitle({ title: '', body: `${divider('7:00 am').trimStart()}Coffee thoughts` })).toBe('Coffee thoughts');
  });

  it('a new session only adds to the entry; earlier text and history stay', async () => {
    const db = freshDb();
    const t0 = new Date(2026, 10, 25, 7).getTime();
    const e = await createEntry(db, { body: 'morning', originalDate: new Date(t0).toISOString() }, t0);
    const t1 = t0 + 3 * 3600_000;
    await saveEntry(db, e.id, { body: `morning${divider('10:00 am')}later` }, t1);
    const now = (await db.entries.get(e.id))!;
    expect(splitSessions(now.body).map((s) => s.text)).toEqual(['morning', 'later']);
    const hist = await getHistory(db, e.id);
    expect(hist.map((r) => r.body)).toEqual(['morning', `morning${divider('10:00 am')}later`]);
  });

  it("finds today's entry so quick thoughts join it", async () => {
    const db = freshDb();
    const today = new Date(2026, 10, 25, 9);
    const yesterday = new Date(2026, 10, 24, 22);
    await createEntry(db, { body: 'yesterday', originalDate: yesterday.toISOString() });
    expect(await findTodaysEntry(db, today)).toBeUndefined();
    const e = await createEntry(db, { body: 'today', originalDate: new Date(2026, 10, 25, 7).toISOString() });
    expect((await findTodaysEntry(db, today))?.id).toBe(e.id);
  });
});
