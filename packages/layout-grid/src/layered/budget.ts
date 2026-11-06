/**
 * The size budget of the searches (layout plan, decision E of 06.11.2026). A search that tries every start or every
 * move grows faster than the picture: the thorough order runs two searches from every layer turned around, and the
 * removal of jogs draws and prices the whole picture for every move it tries. Up to about sixty boxes both run in
 * full; past that they spend a fixed amount of work and stop, so a big picture is laid out in seconds, a little less
 * well. The work is counted, never timed, so the same input gives the same bytes on every machine.
 */

/**
 * Work the thorough order may spend, in places priced: a search from one start moves every node of a layer to every
 * place in it, about the sum of the squared layer sizes, and runs twice, first down and first up.
 */
const ORDER_WORK = 120_000;

/**
 * Work the removal of jogs may spend, in pairs of pieces: one drawing priced by the line check compares about every
 * piece of the picture with every other.
 */
const JOG_WORK = 400_000;

/**
 * How many starting orders the thorough order may try for layers of the sizes in `layerOf`: all where the budget
 * holds them, else as many as it pays for, at least one.
 */
export function orderStarts(layerOf: ReadonlyMap<string, number>): number {
  const sizes = new Map<number, number>();
  for (const l of layerOf.values()) sizes.set(l, (sizes.get(l) ?? 0) + 1);
  const run = [...sizes.values()].reduce((sum, n) => sum + n * n, 0);
  return run === 0 ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(ORDER_WORK / (2 * run)));
}

/**
 * How many drawings the removal of jogs may price for a picture of `pieces` groups of lines, the starting one
 * included: without limit where the budget holds them, and none where it pays for no move beside the start.
 */
export function jogPrices(pieces: number): number {
  const priced = Math.floor(JOG_WORK / Math.max(1, pieces * pieces));
  return priced < 2 ? 0 : priced;
}
