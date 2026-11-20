import { useState } from 'react';
import { Today } from './ui/Today';
import { Journal } from './ui/Journal';
import { Settings } from './ui/Settings';
import { EntryEditor } from './ui/EntryEditor';

type Tab = 'today' | 'journal' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'journal', label: 'Journal' },
  { id: 'settings', label: 'Settings' },
];

interface Editing {
  entryId?: string;
  prompt?: string;
  key: number;
}

export function App() {
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(location.search).get('tab') as Tab) || 'today');
  const [editing, setEditing] = useState<Editing | null>(() =>
    new URLSearchParams(location.search).get('action') === 'write' ? { key: Date.now() } : null,
  );

  const open = (opts: { entryId?: string; prompt?: string }) => setEditing({ ...opts, key: Date.now() });

  return (
    <div className="app">
      {tab === 'today' && <Today onWrite={open} />}
      {tab === 'journal' && <Journal onOpen={(entryId) => open({ entryId })} />}
      {tab === 'settings' && <Settings />}

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {editing && <EntryEditor key={editing.key} entryId={editing.entryId} prompt={editing.prompt} onClose={() => setEditing(null)} />}
    </div>
  );
}
