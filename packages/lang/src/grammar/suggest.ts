/** The closest allowed word within two edits, to suggest a fix for a typo. */
export function nearest(word: string, candidates: readonly string[]): string | undefined {
  const scored = candidates.map((candidate) => ({ candidate, distance: editDistance(word, candidate) }));
  const best = scored.sort((a, b) => a.distance - b.distance)[0];
  return best !== undefined && best.distance <= 2 ? best.candidate : undefined;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}
