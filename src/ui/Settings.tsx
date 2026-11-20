import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { exportSnapshot, restoreSnapshot, snapshotFileName } from '../backup/snapshot';
import { sendCode, signOut, syncNow, useSyncState, verifyCode } from '../sync/controller';
import { timeAgo } from '../lib/format';
import { applyTheme, getTheme, type Theme } from '../lib/theme';

export function Settings() {
  return (
    <main className="screen">
      <h1>Settings</h1>
      <SyncSection />
      <BackupSection />
      <NotificationSection />
      <AppearanceSection />
      <StorageSection />
    </main>
  );
}

function SyncSection() {
  const s = useSyncState();
  const unsynced = useLiveQuery(() => db.entries.where('dirty').equals(1).count(), []);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <>
      <h2>Server backup</h2>
      <div className="settings-group">
        {s.status === 'local-only' && (
          <p>Server backup is not set up yet, so your writing is saved on this phone only. Download a backup file below until it is.</p>
        )}
        {s.status === 'signed-out' && (
          <>
            <p>Sign in to back up to your server. We email you a sign-in code.</p>
            {!sent ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setMsg(null);
                  try {
                    await sendCode(email.trim());
                    setSent(true);
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : String(err));
                  }
                }}
              >
                <input className="field" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button className="btn btn-primary">Send code</button>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setMsg(null);
                  try {
                    await verifyCode(email.trim(), code.trim());
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : String(err));
                  }
                }}
              >
                <input className="field" inputMode="numeric" autoComplete="one-time-code" placeholder="Code from the email" value={code} onChange={(e) => setCode(e.target.value)} required />
                <div className="row">
                  <button className="btn btn-primary">Sign in</button>
                  <button type="button" className="btn btn-quiet" onClick={() => setSent(false)}>
                    Use a different email
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        {['idle', 'syncing', 'offline', 'error'].includes(s.status) && (
          <>
            <p>
              Signed in as {s.email}. Last backed up {timeAgo(s.lastSyncAt)}.
              {unsynced ? ` ${unsynced} ${unsynced === 1 ? 'entry is' : 'entries are'} waiting to back up.` : ' Everything is backed up.'}
            </p>
            {s.status === 'offline' && <p className="muted small">Offline. Writing still saves here and backs up when you reconnect.</p>}
            {s.status === 'error' && <p className="marker small">Backup paused: {s.error}. Your writing is safe on this phone.</p>}
            <div className="row">
              <button className="btn" disabled={s.status === 'syncing'} onClick={() => void syncNow()}>
                {s.status === 'syncing' ? 'Backing up…' : 'Back up now'}
              </button>
              <button className="btn btn-quiet" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </>
        )}
        {msg && <p className="marker small">{msg}</p>}
      </div>
    </>
  );
}

function BackupSection() {
  const [msg, setMsg] = useState<string | null>(null);

  const download = async () => {
    const snap = await exportSnapshot(db);
    const file = new File([JSON.stringify(snap, null, 2)], snapshotFileName(), { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {
        /* cancelled: fall through to download */
      }
    }
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const restore = async (f: File | undefined) => {
    if (!f) return;
    setMsg(null);
    try {
      const r = await restoreSnapshot(db, await f.text());
      setMsg(`Restored ${r.entriesAdded} entries and ${r.revisionsAdded} versions. ${r.entriesSkipped} already here were left untouched.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <h2>Backup file</h2>
      <div className="settings-group">
        <p>A complete copy of every entry and every version, as a JSON file you keep. Save it to Files or your password manager.</p>
        <div className="row">
          <button className="btn" onClick={() => void download()}>
            Download backup
          </button>
          <label className="btn btn-quiet">
            Restore from file
            <input type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e.target.files?.[0])} />
          </label>
        </div>
        <p className="muted small">Restoring only adds what is missing. It never overwrites anything on this phone.</p>
        {msg && <p className="small">{msg}</p>}
      </div>
    </>
  );
}

function NotificationSection() {
  const supported = 'Notification' in window && 'serviceWorker' in navigator;
  const [perm, setPerm] = useState(supported ? Notification.permission : 'denied');

  const test = async () => {
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Good morning', {
      body: 'This is how your daily reminder will look.',
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      tag: 'test',
    });
  };

  return (
    <>
      <h2>Reminders</h2>
      <div className="settings-group">
        {!supported ? (
          <p>On iPhone, reminders work once the app is on your Home Screen: Share, then Add to Home Screen.</p>
        ) : (
          <>
            <p>One gentle reminder a day, no badges. Scheduling arrives in the next phase; check your phone shows notifications from the app.</p>
            <button className="btn" onClick={() => void test()}>
              Send a test notification
            </button>
            {perm === 'denied' && <p className="muted small">Notifications are off for this app in iPhone Settings.</p>}
          </>
        )}
      </div>
    </>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState<Theme>(getTheme());
  return (
    <>
      <h2>Appearance</h2>
      <div className="settings-group">
        <select
          className="field"
          value={theme}
          aria-label="Theme"
          onChange={(e) => {
            const t = e.target.value as Theme;
            setTheme(t);
            applyTheme(t);
          }}
        >
          <option value="dark">Morning dark</option>
          <option value="light">Light</option>
          <option value="system">Match iPhone</option>
        </select>
      </div>
    </>
  );
}

function StorageSection() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const count = useLiveQuery(() => db.entries.count(), []);
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  return (
    <>
      <h2>This phone</h2>
      <div className="settings-group small">
        <p>{count ?? 0} entries stored here.</p>
        <p>
          {standalone ? 'Running from the Home Screen.' : 'Running in the browser. Add to Home Screen for offline use and reminders.'}{' '}
          {persisted ? 'Storage is marked persistent.' : 'iPhone may clear browser storage after weeks unused; the server copy is the one that counts.'}
        </p>
        <p className="muted">Version {__APP_VERSION__}</p>
      </div>
    </>
  );
}
