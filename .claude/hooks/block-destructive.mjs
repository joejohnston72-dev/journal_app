#!/usr/bin/env node
// PreToolUse hook: blocks shell commands that delete files or reset data stores.
// Brief → Build framework: required when Claude Code runs with permissions bypassed.
// Exit code 2 blocks the call and shows the reason to Claude.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const cmd = String(input?.tool_input?.command ?? '');

// Build output and caches that are always safe to remove.
const SAFE_RM = /^(\.\/)?(dist|node_modules|coverage|\.vite|test-results|playwright-report)(\/.*)?$|^\/tmp\//;

const rules = [
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard discards work'],
  [/\bgit\s+clean\s+-[a-z]*f/, 'git clean deletes untracked files'],
  [/\bgit\s+push\b.*(\s--force\b|\s-f\b|--force-with-lease)/, 'force-push rewrites history'],
  [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, 'discards uncommitted changes'],
  [/\bgit\s+branch\s+-D\b/, 'force-deletes a branch'],
  [/\bsupabase\s+db\s+reset\b/, 'resets the database'],
  [/\b(drop\s+(table|schema|database)|truncate\s+(table\s+)?\w)/i, 'destroys database data'],
  [/\bdelete\s+from\b/i, 'deletes database rows'],
  [/\bfind\b.*\s(-delete|-exec\s+rm)\b/, 'bulk-deletes files'],
  [/\b(shred|unlink)\s/, 'deletes files'],
  [/(deleteDatabase|Dexie\.delete)\s*\(/, 'deletes the local store'],
];

function fail(reason) {
  process.stderr.write(`Blocked by .claude/hooks/block-destructive.mjs: ${reason}.\nCommand: ${cmd}\nAsk the user to run it themselves if it is really needed.\n`);
  process.exit(2);
}

for (const [re, why] of rules) if (re.test(cmd)) fail(why);

// rm / rmdir: allow only build outputs and /tmp.
for (const seg of cmd.split(/&&|\|\||;|\||\n/)) {
  const words = seg.trim().split(/\s+/).filter(Boolean);
  while (words[0] === 'sudo' || /^\w+=/.test(words[0] ?? '')) words.shift();
  if (words[0] !== 'rm' && words[0] !== 'rmdir') continue;
  const targets = words.slice(1).filter((w) => !w.startsWith('-'));
  const bad = targets.filter((t) => !SAFE_RM.test(t.replace(/^["']|["']$/g, '')));
  if (bad.length || targets.length === 0) fail(`deletes files (${bad.join(' ') || 'unknown target'})`);
}

process.exit(0);
