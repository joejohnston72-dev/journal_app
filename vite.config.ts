import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * Builds the service worker from src/sw.js with the list of built files to
 * precache, so the app opens offline after the first visit (UX "every screen
 * works offline"). No plugin dependency.
 */
function serviceWorker(): Plugin {
  return {
    name: 'journal-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const publicFiles = (readdirSync('public', { recursive: true, withFileTypes: true }) as import('node:fs').Dirent[])
        .filter((d) => d.isFile())
        .map((d) => `${d.parentPath}/${d.name}`.replace(/^public\//, ''));
      const files = [...Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html'), ...publicFiles];
      const version = createHash('sha256').update(files.sort().join('|')).digest('hex').slice(0, 12);
      const src = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8')
        .replace('self.__PRECACHE__', JSON.stringify(['./', ...files]))
        .replace('__VERSION__', version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; CI sets VITE_BASE.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), serviceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
