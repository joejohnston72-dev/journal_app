import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Prompt } from '../db/schema';
import { isSameDay, longDate } from '../lib/format';
import { fallbackPrompt, localDay, ratePrompt, skipPrompt, todaysPrompt } from '../prompts/library';

interface Props {
  onWrite: (opts: { entryId?: string; prompt?: string; promptId?: string }) => void;
}

export function Today({ onWrite }: Props) {
  const now = new Date();
  const day = localDay(now);
  const [servedId, setServedId] = useState<string | null | undefined>(undefined);
  const [notice] = useState(() => sessionStorage.getItem('importNotice'));
  useEffect(() => sessionStorage.removeItem('importNotice'), []);

  useEffect(() => {
    void todaysPrompt(db, new Date()).then((p) => setServedId(p?.id ?? null));
  }, [day]);

  const served = useLiveQuery(() => (servedId ? db.prompts.get(servedId) : undefined), [servedId]);
  const todays = useLiveQuery(async () => {
    const recent = await db.entries.orderBy('originalDate').reverse().limit(20).toArray();
    return recent.find((e) => !e.deletedAt && e.kind === 'text' && isSameDay(new Date(e.originalDate), now));
  }, []);

  if (servedId === undefined) return <main className="screen" />;
  const text = served?.text ?? fallbackPrompt(now);

  return (
    <main className="screen">
      <p className="eyebrow">{longDate(now)}</p>
      <h1>{now.getHours() < 12 ? 'Good morning' : 'Welcome back'}</h1>
      {notice && <p className="notice small">{notice}</p>}
      <section className="card" aria-label="Today’s prompt">
        <p className="eyebrow">Today’s prompt</p>
        <p className="prompt-text">{text}</p>
        {served?.why && <p className="muted small">Why this prompt: {served.why}</p>}
        <button
          className="btn btn-primary"
          onClick={() => onWrite(todays ? { entryId: todays.id, prompt: text, promptId: served?.id } : { prompt: text, promptId: served?.id })}
        >
          {todays ? 'Continue writing' : 'Write'}
        </button>
        {served && served.status !== 'answered' && (
          <div className="row">
            <button className="btn btn-quiet small" onClick={async () => setServedId((await skipPrompt(db, served.id))?.id ?? null)}>
              Skip for today
            </button>
          </div>
        )}
        {served && <PromptFeedback prompt={served} />}
      </section>
    </main>
  );
}

/** PRM-3: per-prompt signal for the generator. Optional and quiet. */
export function PromptFeedback({ prompt }: { prompt: Prompt }) {
  const [note, setNote] = useState(prompt.feedback ?? '');
  const [open, setOpen] = useState(false);
  const set = (r: 1 | -1) => ratePrompt(db, prompt.id, prompt.rating === r ? null : r);
  return (
    <div className="prompt-feedback">
      <div className="row">
        <button className="btn btn-quiet small" aria-pressed={prompt.rating === 1} onClick={() => void set(1)}>
          Good prompt
        </button>
        <button className="btn btn-quiet small" aria-pressed={prompt.rating === -1} onClick={() => void set(-1)}>
          Not for me
        </button>
        <button className="btn btn-quiet small" onClick={() => setOpen(!open)}>
          {prompt.feedback ? 'Edit note' : 'Add a note'}
        </button>
      </div>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await ratePrompt(db, prompt.id, prompt.rating, note);
            setOpen(false);
          }}
        >
          <textarea className="field" rows={2} placeholder="What would make prompts like this better?" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn small">Save note</button>
        </form>
      )}
    </div>
  );
}
