export type Theme = 'dark' | 'light' | 'system';
const KEY = 'journal.theme';

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'light' || t === 'system' || t === 'dark') return t;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function applyTheme(t: Theme = getTheme()): void {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}
