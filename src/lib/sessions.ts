/**
 * Writing sessions within one day's entry (CAP-1).
 *
 * A day is one entry; separate sittings are marked in the plain text with a
 * divider line, e.g. "—— 2:14 pm ——", so the text stays readable anywhere
 * (export, sync, another app) and no schema change is needed.
 *
 * splitSessions and joinSessions are exact inverses: join(split(body)) === body
 * for every string, so the editor can never alter what was typed.
 */

export interface Session {
  /** Divider label (time the session started); null for the first session. */
  label: string | null;
  text: string;
}

const SEP = /\n\n—— ([^\n]{1,40}?) ——\n\n/;

export function divider(label: string): string {
  return `\n\n—— ${label} ——\n\n`;
}

export function splitSessions(body: string): Session[] {
  const parts = body.split(new RegExp(SEP.source, 'g'));
  const out: Session[] = [{ label: null, text: parts[0] ?? '' }];
  for (let i = 1; i < parts.length; i += 2) out.push({ label: parts[i] ?? '', text: parts[i + 1] ?? '' });
  return out;
}

export function joinSessions(sessions: Session[]): string {
  return sessions.map((s, i) => (i === 0 ? s.text : divider(s.label ?? '') + s.text)).join('');
}

export function sessionLabel(d = new Date()): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

/** True for a divider line on its own, so titles and previews can skip it. */
export function isDividerLine(line: string): boolean {
  return /^—— [^\n]{1,40} ——$/.test(line.trim());
}

/** Reopening the day after this long starts a new session automatically (on first keystroke). */
export const NEW_SESSION_GAP_MS = 30 * 60_000;
