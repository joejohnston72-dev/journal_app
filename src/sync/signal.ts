/** Lets the store tell the sync loop "something changed" without importing it. */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onLocalChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyLocalChange(): void {
  for (const fn of listeners) fn();
}
