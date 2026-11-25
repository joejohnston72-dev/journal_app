/**
 * Prompt generator instructions (rule 5: versioned, with samples in
 * src/prompts/generator/v1.samples.json). Used today by "Copy feedback for
 * Claude" in Settings; the P2 nightly Supabase job will send the same text.
 * Bump the version when the wording changes; never edit an old version's samples.
 */
export const GENERATOR_VERSION = 'v1';

export const GENERATOR_INSTRUCTIONS = `You write my daily journal prompts (generator ${GENERATOR_VERSION}).

Below is JSON from my journal app: prompts I've answered, skipped or rated (rating 1 = good, -1 = not for me, plus notes), session ratings (1–5), the prompts still queued, and recent entries.

Write 14 new prompts for the next two weeks.
- Build on threads in my recent entries; follow up on anything left open.
- Do more of what I rated well; avoid the style of prompts I rated down or skipped twice or more.
- Mix depth: mostly one-page prompts, one lighter prompt every few days, one "re-ask" of an older good prompt each week.
- Low session ratings or a heavy recent entry: go lighter, not deeper.
- No duplicates of the queued prompts.
- One question each, plain and direct, under 30 words.

Reply with only a JSON array: [{"text": "...", "why": "one line on why this prompt, naming the entry or rating it came from"}]`;
