import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { db } from './db/schema';
import { recoverDrafts } from './db/draftBuffer';
import { backupBeforeUpgrade } from './db/preUpgrade';
import { importFromHash } from './prompts/linkImport';
import { startSync } from './sync/controller';
import { applyTheme } from './lib/theme';
import './styles/app.css';

async function boot() {
  applyTheme();
  // Ask iOS not to evict our storage (best effort; the server copy is the master).
  void navigator.storage?.persist?.();
  try {
    await backupBeforeUpgrade();
    await db.open();
    // Words typed just before a crash or force-quit come back first.
    await recoverDrafts(db, localStorage);
    const imported = await importFromHash(db, location.hash).catch((e: unknown) => {
      console.error('Prompt link import failed', e);
      return null;
    });
    if (imported) {
      history.replaceState(null, '', location.pathname + location.search);
      sessionStorage.setItem('importNotice', `Added ${imported.added} prompts to your queue${imported.skipped ? ` (${imported.skipped} were already there)` : ''}.`);
    }
  } catch (e) {
    console.error('Startup recovery failed', e);
  }
  startSync();

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
