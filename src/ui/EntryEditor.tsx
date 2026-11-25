import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { createEntry, displayTitle, moveToBin, resolveConflict, restoreFromBin, saveEntry } from '../db/entries';
import { bufferDraft, clearDraft } from '../db/draftBuffer';
import { newId } from '../lib/id';
import { useSyncState } from '../sync/controller';
import { NEW_SESSION_GAP_MS, joinSessions, sessionLabel, splitSessions } from '../lib/sessions';

const SAVE_DEBOUNCE_MS = 300;

interface Props {
  /** Existing entry, or undefined to start a new one (created on first keystroke). */
  entryId?: string;
  prompt?: string;
  /** Library prompt this entry answers (PRM-7: entries link back to their prompt). */
  promptId?: string;
  /** Quick capture into today's entry: caret goes to the end, and a new session starts if the day was left a while ago. */
  capture?: boolean;
  /** Called with the entry id when an entry exists (so a session can be rated). */
  onClose: (savedEntryId?: string) => void;
}

export function EntryEditor({ entryId, prompt, promptId, capture, onClose }: Props) {
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
  /** Label of a new session that has a divider on screen but no text yet; it joins the entry on the first keystroke. */
  const [pending, setPending] = useState<string | null>(null);
  const autoChecked = useRef(false);

  // Load text once; afterwards adopt outside changes (e.g. a sync) only when nothing is pending.
  useEffect(() => {
    if (!entry) return;
    if (latest.current === null || (timer.current === undefined && entry.body !== lastSaved.current && latest.current === lastSaved.current)) {
      latest.current = entry.body;
      lastSaved.current = entry.body;
      setText(entry.body);
    }
    if (capture && !autoChecked.current) {
      autoChecked.current = true;
      if (entry.body.trim() && Date.now() - entry.updatedAt >= NEW_SESSION_GAP_MS) setPending(sessionLabel());
    }
  }, [entry, capture]);

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

  const committed = splitSessions(text ?? '');
  const sessions = pending ? [...committed, { label: pending, text: '' }] : committed;
  const onSession = (i: number, v: string) => {
    const next = sessions.map((s, j) => (j === i ? { ...s, text: v } : s));
    const typingInPending = pending !== null && i === sessions.length - 1;
    if (typingInPending && !v) return;
    if (typingInPending) setPending(null);
    onChange(joinSessions(typingInPending ? next : next.slice(0, committed.length)));
  };
  const canAddSession = Boolean(text?.trim()) && !pending && !entry?.deletedAt;

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
        <span className="row-tight">
        {canAddSession && (
          <button className="btn btn-quiet small" onClick={() => setPending(sessionLabel())}>
            New session
          </button>
        )}
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
        </span>
      </div>
      <div className="editor-scroll">
        <div className="editor-inner">
          {entry?.conflict && <ConflictNotice entryId={id} theirs={entry.conflict.theirRevisionId} mine={text ?? ''} />}
          {entry?.deletedAt && <p className="notice small">This entry is in the bin. Nothing in the bin is ever emptied automatically.</p>}
          {prompt && <p className="editor-prompt">{prompt}</p>}
          {sessions.map((s, i) => {
            const last = i === sessions.length - 1;
            return (
              <div key={i}>
                {s.label !== null && (
                  <div className="session-divider" role="separator" aria-label={`New session, ${s.label}`}>
                    <span>{s.label}</span>
                  </div>
                )}
                <SessionText
                  value={s.text}
                  last={last}
                  onChange={(v) => onSession(i, v)}
                  onBlur={() => void flush()}
                  placeholder={text === null ? '' : i === 0 ? 'Begin anywhere.' : last ? 'Carry on…' : ''}
                  focus={last && (!entryId || (text !== null && (capture || pending !== null)))}
                  focusKey={pending ?? ''}
                  loading={text === null}
                  label={i === 0 ? 'Entry text' : `Session at ${s.label}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** One session's text. Grows with its content so the day reads as one page. */
function SessionText(props: {
  value: string;
  last: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  focus: boolean;
  focusKey: string;
  /** Existing text not loaded yet: typing now could replace it, so wait. */
  loading: boolean;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  const focused = useRef<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !props.focus || focused.current === props.focusKey || el === document.activeElement) return;
    focused.current = props.focusKey;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.scrollIntoView({ block: 'center' });
  }, [props.focus, props.focusKey]);
  return (
    <textarea
      ref={ref}
      className={props.last ? 'editor-text' : 'editor-text editor-text-fit'}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
      placeholder={props.placeholder}
      rows={1}
      readOnly={props.loading}
      spellCheck
      aria-label={props.label}
    />
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
