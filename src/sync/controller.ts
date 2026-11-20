import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { db } from '../db/schema';
import { syncOnce } from './engine';
import { SupabaseRemote } from './supabaseRemote';
import { onLocalChange } from './signal';
import { NetworkError } from './remote';

/**
 * Runs sync in the background of the open app: on launch, on reconnect, when
 * the app comes to the front, shortly after local saves, and every minute.
 * iPhone web apps get no background sync; server jobs do background work.
 */

export type SyncStatus = 'local-only' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  email: string | null;
  lastSyncAt: number | null;
  error: string | null;
}

let state: SyncState = {
  status: supabase ? 'signed-out' : 'local-only',
  email: null,
  lastSyncAt: null,
  error: null,
};
const subs = new Set<() => void>();
let session: Session | null = null;
let debounce: ReturnType<typeof setTimeout> | undefined;
const remote = supabase ? new SupabaseRemote(supabase) : null;

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const fn of subs) fn();
}

export async function syncNow(): Promise<void> {
  if (!remote || !session) return;
  if (!navigator.onLine) return set({ status: 'offline' });
  set({ status: 'syncing', error: null });
  try {
    await syncOnce(db, remote);
    set({ status: 'idle', lastSyncAt: Date.now() });
  } catch (e) {
    if (e instanceof NetworkError || !navigator.onLine) set({ status: 'offline' });
    else set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

function soon(ms = 2000) {
  clearTimeout(debounce);
  debounce = setTimeout(() => void syncNow(), ms);
}

let started = false;
export function startSync(): void {
  if (started || !supabase) return;
  started = true;
  void db.meta.get('lastSyncAt').then((m) => set({ lastSyncAt: typeof m?.value === 'number' ? m.value : null }));
  supabase.auth.onAuthStateChange((_event, s) => {
    session = s;
    set({ status: s ? 'idle' : 'signed-out', email: s?.user.email ?? null });
    if (s) soon(0);
  });
  onLocalChange(() => soon());
  window.addEventListener('online', () => soon(0));
  window.addEventListener('offline', () => set({ status: 'offline' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') soon(0);
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, 60_000);
}

export async function sendCode(email: string): Promise<void> {
  if (!supabase) throw new Error('Server not configured');
  // shouldCreateUser: false — this is a single-account app; create the account in the Supabase dashboard.
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error('Server not configured');
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => state,
  );
}
