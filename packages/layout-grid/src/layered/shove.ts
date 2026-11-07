/** The longest move that takes neighbours along: a short bend, such as a jog just over the limit of a slip. */
export const SHOVE = 48;

/** The most pieces of a picture whose moves take neighbours along; larger pictures keep the moves of one box. */
export const SHOVE_PIECES = 40;

/**
 * What moves when `moving` moves by `d` and takes along what stands beyond it in that direction: in each layer it
 * touches, every node from the outermost of `moving` to the end of the layer, with what moves with each (`with`, such
 * as the boxes of its frame, or the chain of a placeholder), so the move needs room only at the end of each layer.
 */
export function shoved(
  moving: readonly string[],
  d: number,
  layerOf: (n: string) => readonly string[],
  withOf: (n: string) => readonly string[],
): string[] {
  const out = new Set(moving);
  for (const n of moving) {
    const layer = layerOf(n);
    const i = layer.indexOf(n);
    const beyond = d > 0 ? layer.slice(i + 1) : layer.slice(0, Math.max(0, i)).reverse();
    for (const m of beyond) {
      const group = withOf(m);
      for (const g of group.length > 0 ? group : [m]) out.add(g);
    }
  }
  return [...out];
}
