import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { createEntry, displayTitle, moveToBin, resolveConflict, restoreFromBin, saveEntry } from '../db/entries';
import { bufferDraft, clearDraft } from '../db/draftBuffer';
import { newId } from '../lib/id';
import { useSyncState } from '../sync/controller';

const SAVE_DEBOUNCE_MS = 300;

interface Props {
  /** Existing entry, or undefined to start a new one (created on first keystroke). */
  entryId?: string;
  prompt?: string;
  /** Library prompt this entry answers (PRM-7: entries link back to their prompt). */
  promptId?: string;
  /** Called with the entry id when an entry exists (so a session can be rated). */
  onClose: (savedEntryId?: string) => void;
}

export function EntryEditor({ entryId, prompt, promptId, onClose }: Props) {
  const [id] = useState(() => entryId ?? newId());
  const entry = useLiveQuery(() => db.entries.get(id), [id]);
  const sync = useSyncState();

  const [text, setText] = useState<string | null>(entryId ? null : '');
  const latest = useRef<string | null>(text);
  const lastSaved = useRef<string | null>(null);
  const exists = useRef(Boolean(entryId));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [saving, setSaving] = useState(false);

  // Load text once; afterwards adopt outside changes (e.g. a sync) only when nothing is pending.
  useEffect(() => {
    if (!entry) return;
    if (latest.current === null || (timer.current === undefined && entry.body !== lastSaved.current && latest.current === lastSaved.current)) {
      latest.current = entry.body;
      lastSaved.current = entry.body;
      setText(entry.body);
    }
  }, [entry]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const body = latest.current;
    if (body === null || body === lastSaved.current) return queue.current;
    setSaving(true);
    queue.current = queue.current
      .then(async () => {
        if (!exists.current) {
          if (!body.trim()) return;
          await createEntry(db, { id, body, promptId: promptId ?? null });
          exists.current = true;
        } else {
          await saveEntry(db, id, { body });
        }
        lastSaved.current = body;
        if (latest.current === body) clearDraft(localStorage, id);
      })
      .catch((e: unknown) => console.error('Save failed; text kept in crash buffer', e))
      .finally(() => setSaving(false));
    return queue.current;
  }, [id]);

  const onChange = (v: string) => {
    setText(v);
    latest.current = v;
    bufferDraft(localStorage, id, { entryId: id, body: v, at: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    const onHide = () => void flush();
    const onVis = () => document.visibilityState === 'hidden' && onHide();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVis);
      void flush();
    };
  }, [flush]);

  const close = async () => {
    await flush();
    onClose(exists.current ? id : undefined);
  };

  const status = (() => {
    if (saving || timer.current) return 'Saving…';
    if (!entry) return text ? '' : 'Start writing';
    if (sync.status === 'local-only') return 'Saved on this phone';
    if (entry.conflict) return 'Two versions kept';
    return entry.dirty ? 'Saved · not backed up yet' : 'Saved · backed up';
  })();

  return (
    <div className="editor" role="dialog" aria-label={entry ? displayTitle(entry) : 'New entry'}>
      <div className="editor-bar">
        <button className="btn btn-quiet" onClick={close}>
          Done
        </button>
        <span className="editor-status" aria-live="polite">
          {status}
        </span>
        {entry && (
          <button
            className="btn btn-quiet small"
            onClick={async () => {
              await flush();
              if (entry.deletedAt) await restoreFromBin(db, id);
              else {
                await moveToBin(db, id);
                onClose();
              }
            }}
          >
            {entry.deletedAt ? 'Restore' : 'Move to bin'}
          </button>
        )}
      </div>
      <div className="editor-scroll">
        <div className="editor-inner">
          {entry?.conflict && <ConflictNotice entryId={id} theirs={entry.conflict.theirRevisionId} mine={text ?? ''} />}
          {entry?.deletedAt && <p className="notice small">This entry is in the bin. Nothing in the bin is ever emptied automatically.</p>}
          {prompt && <p className="editor-prompt">{prompt}</p>}
          <textarea
            className="editor-text"
            value={text ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => void flush()}
            placeholder={text === null ? '' : 'Begin anywhere.'}
            autoFocus={!entryId}
            spellCheck
            aria-label="Entry text"
          />
        </div>
      </div>
    </div>
  );
}

function ConflictNotice({ entryId, theirs, mine }: { entryId: string; theirs: string; mine: string }) {
  const other = useLiveQuery(() => db.revisions.get(theirs), [theirs]);
  const [open, setOpen] = useState(false);
  if (!other) return null;
  const resolve = (body: string) => resolveConflict(db, entryId, { body });
  return (
    <div className="notice small">
      <p>This entry was also edited on another device. Both versions are kept; choose how to continue.</p>
      <button className="btn btn-quiet small" onClick={() => setOpen(!open)}>
        {open ? 'Hide other version' : 'Show other version'}
      </button>
      {open && <div className="version">{other.body}</div>}
      <div className="row">
        <button className="btn small" onClick={() => resolve(mine)}>
          Keep this one
        </button>
        <button className="btn small" onClick={() => resolve(other.body)}>
          Use other
        </button>
        <button className="btn small" onClick={() => resolve(`${mine}\n\n———\n\n${other.body}`)}>
          Keep both
        </button>
      </div>
      <p className="muted small">Whichever you choose, both versions stay in history.</p>
    </div>
  );
}
