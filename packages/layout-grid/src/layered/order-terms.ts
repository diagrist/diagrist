/** The crossings among the pieces between two layers, each piece as its two places and its weight, weighted. */
export function crossed(pairs: readonly (readonly [number, number, number])[]): number {
  let total = 0;
  for (let i = 0; i < pairs.length; i++) {
    const [p0, p1, pw] = pairs[i] as readonly [number, number, number];
    for (let j = i + 1; j < pairs.length; j++) {
      const [q0, q1, qw] = pairs[j] as readonly [number, number, number];
      if ((p0 - q0) * (p1 - q1) < 0) total += pw * qw;
    }
  }
  return total;
}

/** Nodes of a layer standing beyond one kept to the outside, or before one whose given place is earlier. */
export function misplaced(
  layer: readonly string[],
  pins: ReadonlyMap<string, 'left' | 'right'>,
  given: ReadonlyMap<string, number>,
): number {
  let total = 0;
  for (let i = 0; i < layer.length; i++) {
    const n = layer[i] as string;
    const pin = pins.get(n);
    const place = given.get(n);
    if (pin === 'left') for (let k = 0; k < i; k++) total += pins.get(layer[k] as string) !== pin ? 1 : 0;
    if (pin === 'right')
      for (let k = i + 1; k < layer.length; k++) total += pins.get(layer[k] as string) !== pin ? 1 : 0;
    if (place !== undefined)
      for (let k = i + 1; k < layer.length; k++) total += (given.get(layer[k] as string) ?? place) < place ? 1 : 0;
  }
  return total;
}

/** Foreign nodes standing between the first and the last member of a cluster in a layer, over all clusters. */
export function spread(layer: readonly string[], cluster: ReadonlyMap<string, string>): number {
  const ends = new Map<string, [number, number, number]>();
  for (let i = 0; i < layer.length; i++) {
    const c = cluster.get(layer[i] as string);
    if (c === undefined) continue;
    const e = ends.get(c);
    if (e === undefined) ends.set(c, [i, i, 1]);
    else [e[1], e[2]] = [i, e[2] + 1];
  }
  let total = 0;
  for (const [first, last, members] of ends.values()) total += last - first + 1 - members;
  return total;
}
