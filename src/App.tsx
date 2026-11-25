import { useState } from 'react';
import { Today } from './ui/Today';
import { Journal } from './ui/Journal';
import { Settings } from './ui/Settings';
import { EntryEditor } from './ui/EntryEditor';
import { Reflect } from './ui/Reflect';

type Tab = 'today' | 'journal' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'journal', label: 'Journal' },
  { id: 'settings', label: 'Settings' },
];

interface Editing {
  entryId?: string;
  prompt?: string;
  promptId?: string;
  key: number;
}

export function App() {
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(location.search).get('tab') as Tab) || 'today');
  const [editing, setEditing] = useState<Editing | null>(() =>
    new URLSearchParams(location.search).get('action') === 'write' ? { key: Date.now() } : null,
  );

  const [reflecting, setReflecting] = useState<{ entryId: string; promptId?: string } | null>(null);
  const open = (opts: { entryId?: string; prompt?: string; promptId?: string }) => setEditing({ ...opts, key: Date.now() });
  const closeEditor = (savedEntryId?: string) => {
    // Only sessions started from today's prompt get the close step.
    if (savedEntryId && editing?.prompt) setReflecting({ entryId: savedEntryId, promptId: editing.promptId });
    setEditing(null);
  };

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

      {editing && (
        <EntryEditor key={editing.key} entryId={editing.entryId} prompt={editing.prompt} promptId={editing.promptId} onClose={closeEditor} />
      )}
      {reflecting && <Reflect entryId={reflecting.entryId} promptId={reflecting.promptId} onDone={() => setReflecting(null)} />}
    </div>
  );
}
