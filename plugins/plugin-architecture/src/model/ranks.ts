import { type Band, loose, orderBand } from './ranks-order.js';
import { besidePeople, outward, placeBands, type Side, type Spot } from './ranks-place.js';
import type { ArchEdge, ArchitectureModel, ArchNode } from './types.js';

/** More neighbours than this in one band move to the left and right of the hub, one each. */
const WIDEST_BAND = 5;
const HUB_ROW = 'hub';

/** The hub of a star: the element with `emph`, else the one with the most edges, the first of equals. */
function hubOf(model: ArchitectureModel): ArchNode | undefined {
  const degree = (n: ArchNode) => model.edges.filter((e) => e.from === n.id || e.to === n.id).length;
  const emph = model.nodes.find((n) => n.emph);
  return emph ?? [...model.nodes].sort((a, b) => degree(b) - degree(a))[0];
}

/**
 * The band of every neighbour: above the hub what calls it, below what it calls, by the majority of their edges and,
 * when even, in the band with fewer neighbours, or by the first edge. A node without an edge to the hub joins a node it is linked to, the members of a group
 * stand in the band most of them stand in, and what is left goes above.
 */
function sidesOf(model: ArchitectureModel, hub: string): Map<string, Side> {
  const sides = new Map<string, Side>();
  const even: [string, Side][] = [];
  for (const n of model.nodes) {
    if (n.id === hub) continue;
    const own = model.edges.filter((e) => (e.from === n.id && e.to === hub) || (e.to === n.id && e.from === hub));
    if (own.length === 0) continue;
    const calls = own.filter((e) => e.from === n.id).length;
    if (calls * 2 === own.length) even.push([n.id, own[0]?.from === n.id ? 'top' : 'bottom']);
    else sides.set(n.id, calls * 2 > own.length ? 'top' : 'bottom');
  }
  const count = (side: Side) => [...sides.values()].filter((s) => s === side).length;
  for (const [id, first] of even) {
    const [up, down] = [count('top'), count('bottom')];
    sides.set(id, up === down ? first : up < down ? 'top' : 'bottom');
  }
  const rest = () => model.nodes.filter((n) => n.id !== hub && !sides.has(n.id));
  for (let open = rest(); open.length > 0; open = rest()) {
    const joined = open.flatMap((n) =>
      model.edges.flatMap((e) => {
        const other = e.from === n.id ? e.to : e.to === n.id ? e.from : undefined;
        const side = other === undefined ? undefined : sides.get(other);
        return side ? [[n.id, side] as const] : [];
      }),
    )[0];
    if (joined) sides.set(joined[0], joined[1]);
    else for (const n of open) sides.set(n.id, 'top');
  }
  for (const g of model.groups) {
    const up = g.members.filter((id) => sides.get(id) === 'top').length;
    for (const id of g.members) if (sides.has(id)) sides.set(id, up * 2 > g.members.length ? 'top' : 'bottom');
  }
  return sides;
}

/** A loose neighbour of the wider band from its right end, then from its left, until both bands are narrow enough. */
function aside(model: ArchitectureModel, bands: Record<Side, Band>): { bands: Record<Side, Band>; beside: Band } {
  const beside: string[] = [];
  let out = bands;
  for (const end of ['right', 'left'] as const) {
    const wide: Side = out.top.length > out.bottom.length ? 'top' : 'bottom';
    const band = out[wide];
    if (band.length <= WIDEST_BAND) break;
    const from = end === 'right' ? [...band].reverse() : band;
    const pick = from.find((id) => loose(model, id, band));
    if (pick === undefined) break;
    beside.push(pick);
    out = { ...out, [wide]: band.filter((id) => id !== pick) };
  }
  return { bands: out, beside };
}

/**
 * The model laid out as a star of ranks (`layout=ranks`): the hub alone in the middle row, what calls it in the row
 * above and what it calls in the row below, each neighbour in a column of its own whose middle its edges to the hub
 * run down (`lane`), so every such edge is one straight vertical line. The hub is only as wide as the longer run of
 * neighbours on it, the shorter run centred on it; people beyond the rows of systems stand beside the hub. Neighbours
 * linked to each other stand side by side, as do the members of a group; too many in a band move beside the hub.
 * Places the source gives are replaced; the grid is adaptive, so columns and gaps grow to their texts.
 */
export function ranked(model: ArchitectureModel): ArchitectureModel {
  const hub = hubOf(model);
  if (hub === undefined) return { ...model, adaptive: true, ranks: true };
  const sides = sidesOf(model, hub.id);
  const band = (side: Side) =>
    orderBand(
      model,
      model.nodes.filter((n) => sides.get(n.id) === side).map((n) => n.id),
    );
  const hubEdges = (id: string) =>
    model.edges.filter((e) => (e.from === id && e.to === hub.id) || (e.to === id && e.from === hub.id));
  const linked = (id: string) => hubEdges(id).length > 0;
  const crowded = aside(model, { top: band('top'), bottom: band('bottom') });
  const { bands, left, right } = besidePeople(
    model,
    crowded.bands,
    { left: crowded.beside[1], right: crowded.beside[0] },
    linked,
  );
  const placed = placeBands(
    { top: outward(model, bands.top, linked), bottom: outward(model, bands.bottom, linked) },
    linked,
  );
  const cols = [...(left ? ['left'] : []), ...placed.cols, ...(right ? ['right'] : [])];
  const rows = [...(bands.top.length ? ['top'] : []), HUB_ROW, ...(bands.bottom.length ? ['bottom'] : [])];
  const rowOf = (id: string) => (bands.top.includes(id) ? 'top' : bands.bottom.includes(id) ? 'bottom' : HUB_ROW);
  const spotOf = (id: string): Spot | undefined =>
    id === hub.id
      ? placed.hub
      : id === left
        ? { col: 'left', to: 'left' }
        : id === right
          ? { col: 'right', to: 'right' }
          : placed.spots.get(id);
  const nodes = model.nodes.map((n): ArchNode => {
    const { at: _, span: __, slot: ___, ...rest } = n;
    const spot = spotOf(n.id);
    if (spot === undefined) return rest;
    return {
      ...rest,
      at: { col: spot.col, row: rowOf(n.id) },
      ...(spot.to !== spot.col ? { span: { col: spot.to } } : {}),
    };
  });
  const lanes = new Map([...placed.spots].flatMap(([id, spot]) => hubEdges(id).map((e) => [e.index, spot] as const)));
  const edges = model.edges.map((e): ArchEdge => {
    const { lane: _, laneTo: __, ...rest } = e;
    const lane = lanes.get(e.index);
    if (!lane) return rest;
    return { ...rest, lane: lane.col, ...(lane.to !== lane.col ? { laneTo: lane.to } : {}) };
  });
  const halves = placed.halves ? { halfCols: placed.cols } : {};
  return { ...model, adaptive: true, ranks: true, cols, rows, nodes, edges, ...halves };
}
