import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { markAnswered, recordSession } from '../prompts/library';
import { PromptFeedback } from './Today';

interface Props {
  entryId: string;
  promptId?: string;
  onDone: () => void;
}

const LABELS = ['Hard going', 'Meh', 'Okay', 'Good', 'Really good'];

/** Close step (brief → Daily session, step 6): optional session rating + prompt feedback. Skippable, no guilt. */
export function Reflect({ entryId, promptId, onDone }: Props) {
  const prompt = useLiveQuery(() => (promptId ? db.prompts.get(promptId) : undefined), [promptId]);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const finish = async (save: boolean) => {
    if (promptId) await markAnswered(db, promptId);
    if (save && (rating !== null || note.trim())) await recordSession(db, { promptId: promptId ?? null, entryId, rating, note });
    onDone();
  };

  return (
    <div className="editor" role="dialog" aria-label="How was this session?">
      <div className="editor-scroll">
        <div className="editor-inner">
          <h2>How was this session?</h2>
          <div className="row" role="radiogroup" aria-label="Session rating">
            {LABELS.map((l, i) => (
              <button key={l} className="btn small" role="radio" aria-checked={rating === i + 1} onClick={() => setRating(rating === i + 1 ? null : i + 1)}>
                {l}
              </button>
            ))}
          </div>
          <textarea className="field" rows={2} placeholder="One line, if you like" value={note} onChange={(e) => setNote(e.target.value)} />
          {prompt && (
            <>
              <p className="eyebrow">The prompt</p>
              <p className="muted">{prompt.text}</p>
              <PromptFeedback prompt={prompt} />
            </>
          )}
          <div className="row">
            <button className="btn btn-primary" onClick={() => void finish(true)}>
              Done
            </button>
            <button className="btn btn-quiet" onClick={() => void finish(false)}>
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
