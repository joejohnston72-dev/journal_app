/**
 * Placeholder prompts until the P1 starter set (30 hand-written) and the P2
 * prompt engine land. Rotates by day so offline mornings still have one.
 */
export const STARTER_PROMPTS = [
  'What is asking for your attention this morning?',
  'What did yesterday teach you that you have not written down yet?',
  'Which belief of yours would you most like to test this week?',
  'What would make today feel well spent, looking back tonight?',
  'Where are you holding tension right now, and what is it protecting?',
  'What idea keeps returning to you? Follow it for a page.',
  'Who are you becoming, and what is one small vote for that person today?',
];

export function promptForDate(d = new Date()): string {
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return STARTER_PROMPTS[day % STARTER_PROMPTS.length]!;
}
