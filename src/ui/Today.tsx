import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { isSameDay, longDate } from '../lib/format';
import { promptForDate } from '../prompts/starter';

interface Props {
  onWrite: (opts: { entryId?: string; prompt?: string }) => void;
}

export function Today({ onWrite }: Props) {
  const now = new Date();
  const prompt = promptForDate(now);
  const todays = useLiveQuery(async () => {
    const recent = await db.entries.orderBy('originalDate').reverse().limit(20).toArray();
    return recent.find((e) => !e.deletedAt && e.kind === 'text' && isSameDay(new Date(e.originalDate), now));
  }, []);

  return (
    <main className="screen">
      <p className="eyebrow">{longDate(now)}</p>
      <h1>{now.getHours() < 12 ? 'Good morning' : 'Welcome back'}</h1>
      <section className="card" aria-label="Today’s prompt">
        <p className="eyebrow">Today’s prompt</p>
        <p className="prompt-text">{prompt}</p>
        <button className="btn btn-primary" onClick={() => onWrite(todays ? { entryId: todays.id, prompt } : { prompt })}>
          {todays ? 'Continue writing' : 'Write'}
        </button>
      </section>
    </main>
  );
}
