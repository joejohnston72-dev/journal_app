import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Entry } from '../db/schema';
import { displayTitle } from '../db/entries';
import { shortDate } from '../lib/format';

interface Props {
  onOpen: (entryId: string) => void;
}

export function Journal({ onOpen }: Props) {
  const [showBin, setShowBin] = useState(false);
  const all = useLiveQuery(() => db.entries.orderBy('originalDate').reverse().toArray(), []);
  if (!all) return <main className="screen" />;
  const live = all.filter((e) => !e.deletedAt);
  const binned = all.filter((e) => e.deletedAt);

  return (
    <main className="screen">
      <h1>Journal</h1>
      {live.length === 0 && <p className="muted">Nothing here yet. Your entries will gather here, newest first.</p>}
      <EntryList entries={live} onOpen={onOpen} />
      {binned.length > 0 && (
        <>
          <button className="btn btn-quiet small" onClick={() => setShowBin(!showBin)}>
            {showBin ? 'Hide bin' : `Bin (${binned.length})`}
          </button>
          {showBin && <EntryList entries={binned} onOpen={onOpen} />}
        </>
      )}
    </main>
  );
}

function EntryList({ entries, onOpen }: { entries: Entry[]; onOpen: (id: string) => void }) {
  return (
    <ul className="list">
      {entries.map((e) => (
        <li key={e.id}>
          <button className="list-item" onClick={() => onOpen(e.id)}>
            <p className="list-title">{displayTitle(e)}</p>
            <span className="list-meta">
              <span>{shortDate(e.originalDate)}</span>
              {e.conflict ? <span className="marker">two versions</span> : e.dirty ? <span className="marker">not backed up</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
