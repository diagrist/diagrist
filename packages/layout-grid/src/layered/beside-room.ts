/**
 * The room an edge drawn beside asks between its two boxes, shared out over the gaps of placeholders that stand
 * between them: a long line passing between two neighbours would otherwise squeeze the room their texts need, so
 * each gap of the run gets an even share. Returns the room between two nodes that stand next to each other: their own,
 * or their share of the room of the two boxes around them.
 */
export function roomAcross(
  layers: readonly (readonly string[])[],
  dummy: (n: string) => boolean,
  room: (a: string, b: string) => number,
): (a: string, b: string) => number {
  const shares = new Map<string, number>();
  for (const layer of layers) {
    let left = -1;
    layer.forEach((n, i) => {
      if (dummy(n)) return;
      const between = i - left - 1;
      const asked = left >= 0 && between > 0 ? room(layer[left] as string, n) : 0;
      if (asked > 0) for (let k = left; k < i; k++) shares.set(`${layer[k]}|${layer[k + 1]}`, asked / (between + 1));
      left = i;
    });
  }
  return (a, b) => Math.max(room(a, b), shares.get(`${a}|${b}`) ?? 0);
}
