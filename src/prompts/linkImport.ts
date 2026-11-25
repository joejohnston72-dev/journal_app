import type { JournalDB } from '../db/schema';
import { importPrompts, parsePromptText } from './library';

/**
 * One-tap private import: `…/#import=<base64url JSON>`. The part after `#` never
 * leaves the phone (browsers don't send it to the server), so personal prompts
 * never touch the public repo or site. Add-only; duplicates are skipped.
 */
export function encodeImportLink(base: string, prompts: unknown, source = 'reminders'): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ source, prompts }));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `${base}#import=${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export function decodeImportHash(hash: string): { source: 'reminders' | 'claude'; text: string } | null {
  const m = /^#import=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return null;
  const bin = atob(m[1]!.replace(/-/g, '+').replace(/_/g, '/'));
  const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  const data = JSON.parse(json) as { source?: string; prompts: unknown };
  return { source: data.source === 'claude' ? 'claude' : 'reminders', text: JSON.stringify(data.prompts) };
}

export async function importFromHash(db: JournalDB, hash: string): Promise<{ added: number; skipped: number } | null> {
  const d = decodeImportHash(hash);
  if (!d) return null;
  return importPrompts(db, parsePromptText(d.text), d.source, d.source === 'reminders' ? 'Reminders' : 'Claude link');
}
