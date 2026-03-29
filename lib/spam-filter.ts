// Heuristic pre-filter — cheap, synchronous, no model call.
// Catches obvious spam before the motion is ever created.
export const SPAM_PATTERNS = [
  /https?:\/\//i,
  /\b(buy now|click here|earn money|make money fast|casino|crypto|bitcoin|nft|free offer|discount code)\b/i,
  /(.)\1{8,}/,   // 9+ repeated chars
];

export function isSpam(title: string, description: string): boolean {
  const text = `${title} ${description}`;
  if (SPAM_PATTERNS.some((p) => p.test(text))) return true;
  if (title.length < 8) return true;
  if (description.trim().split(/\s+/).length < 5) return true;
  return false;
}
