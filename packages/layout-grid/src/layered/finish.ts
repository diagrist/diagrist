import type { Rect } from '@diagrist/core';
import type { Route } from '../layout.js';
import { scoreOf } from '../score.js';
import type { Arrangement } from './arrange.js';
import { type Around, bendSides } from './bend.js';
import { besideRoutes, sideOf } from './beside.js';
import { assignTracks, gapHeight, type Piece, piecesOf } from './channels.js';
import { coords, spinesOf, type Xs } from './coords.js';
import { clearCore } from './fence.js';
import { framesOf } from './frames.js';
import { type Frame, linkPoints, simplify } from './geometry.js';
import { clearHeads } from './heads.js';
import { type Placement, unjog } from './jogs.js';
import { labelRoom, seatsOf } from './labels.js';
import { lanesOf } from './lanes.js';
import { type Group, groupsOf, type Link, linksOf } from './links.js';
import { loopsOf } from './loops.js';
import { type Assembled, assemble, type LayeredLayout, layeredLines } from './output.js';
import { portsOf } from './ports.js';
import { runsOf } from './runs.js';
import { keptInside } from './shift.js';
import type { LayeredSpec } from './spec.js';

export type { LayeredLayout } from './output.js';

/** Positions, ports, tracks, routes and labels of an arranged picture. */
export function finish(spec: LayeredSpec, arrangement: Arrangement): LayeredLayout {
  const m = spec.metrics;
  const { ranked, neighbours, layers } = arrangement;
  const core = new Set(spec.hub?.core ?? []);
  const pad = spec.hub?.pad ?? 0;
  const size = new Map(spec.nodes.map((n) => [n.id, n]));
  const width = (id: string) => size.get(id)?.width ?? 0;
  const dummy = (id: string) => ranked.dummies.has(id);
  const fenced = (a: string, b: string) => !dummy(a) && !dummy(b) && core.has(a) !== core.has(b);
  const fr = framesOf(spec, ranked);
  const runs = runsOf(spec, ranked);
  const loops = loopsOf(spec, m, ranked, layers);
  const base = (a: string, b: string) =>
    dummy(a) && dummy(b) ? m.track : dummy(a) || dummy(b) ? m.colGap / 2 : m.colGap + (fenced(a, b) ? pad : 0);
  const gap = (a: string, b: string) => Math.max(base(a, b), runs.room(a, b)) + fr.walls(a, b) + loops.room(a, b);
  const inCore = layers.flatMap((layer, l) => (layer.some((n) => core.has(n)) ? [l] : []));
  const headRoom = spec.hub ? pad + spec.hub.head.size + 2 + 2 * m.labelGap : 0;
  const above = (l: number) => (l === (inCore[0] ?? -2) - 1 ? headRoom : 0) + fr.head(l + 1);
  const under = (l: number) => (l === inCore.at(-1) ? pad + m.labelGap : 0) + fr.foot(l);
  const spines = spec.hub ? [] : spinesOf(spec.edges, ranked);
  const ln = lanesOf(spec, ranked);
  const settle = (placed: Xs): Placement => {
    ln.clear(placed, width, m.left);
    fr.clear(placed, layers, width, m.colGap);
    const flat = new Map([...placed].map(([id, cx]) => [id, { x: cx - width(id) / 2, y: 0, w: width(id), h: 0 }]));
    const ports = portsOf(
      groups,
      ranked,
      flat,
      placed,
      m.portGap,
      undefined,
      undefined,
      undefined,
      below.ends,
      below.tops,
    );
    return { x: placed, flat, ports };
  };
  const place = () => {
    const placed = coords({ layers, width, gap, links: neighbours, ranked, spines }, m.left);
    clearCore(placed, layers, width, core, arrangement.pins ?? new Map(), m.colGap + pad);
    const settled = settle(placed);
    if (spec.hub) return settled;
    const price = (p: Placement) => scoreOf(layeredLines(spec, draw(p))).cost;
    return unjog({ layers, width, gap, groups, ranked, settle, blockOf: fr.block, price, spines }, settled);
  };
  let below = besideRoutes(ranked, layers, new Set(), m.lead);
  const links = linksOf(spec, ranked).filter((l) => !runs.hidden(l.edge));
  const groups = groupsOf(spec, ranked, layers, links);
  const seats = seatsOf(spec.edges, groups, ranked);
  let grown: ReadonlySet<string> = new Set();
  const draw = ({ x, ports }: Placement): Assembled => {
    const pieceOf = new Map<Group, Piece>();
    const tracks = layers.map((_, l) => {
      const pieces = piecesOf(
        groups.filter((g) => g.links[0]?.gap === l),
        ports,
      );
      for (const p of pieces) pieceOf.set(p.group, p);
      return assignTracks(pieces);
    });
    const headsUp = new Set(
      spec.edges.flatMap((e) =>
        ranked.down.get(e.id) === false ? [ranked.layerOf.get(ranked.chains.get(e.id)?.[0] ?? '') ?? -1] : [],
      ),
    );
    const run = (l: number) => (headsUp.has(l) ? m.lead : m.tail);
    const first = layers.map(
      (_, l) => Math.max(run(l), runs.top(l), labelRoom(seats, l, 'top', m.labelGap, grown)) + under(l),
    );
    const last = layers.map(
      (_, l) => Math.max(m.lead, runs.bottom(l), labelRoom(seats, l, 'bottom', m.labelGap, grown)) + above(l),
    );
    const rects = new Map<string, Rect>();
    const gapTop: number[] = [];
    const bandTop: number[] = [];
    const overFirst = below.count(-1);
    let y = m.top + (inCore[0] === 0 ? headRoom : 0) + fr.head(0) + (overFirst > 0 ? overFirst * m.track + m.lead : 0);
    layers.forEach((layer, l) => {
      const band = Math.max(0, ...layer.map((n) => size.get(n)?.height ?? 0));
      bandTop.push(y);
      for (const n of layer) {
        const h = size.get(n)?.height ?? band;
        rects.set(n, { x: (x.get(n) ?? 0) - width(n) / 2, y: y + (band - h) / 2, w: width(n), h });
      }
      gapTop.push(y + band);
      const extra = below.count(l);
      const needed = (tracks[l] ?? 0) + extra;
      const measure = {
        first: first[l] ?? m.tail,
        track: m.track,
        last: last[l] ?? m.lead,
        min: m.rowGapMin,
      };
      y += band + (l === layers.length - 1 && extra === 0 ? 0 : gapHeight(needed, measure));
    });
    const frame: Frame = { rects, gapTop, first, track: m.track };
    const groupOf = new Map<Link, Group>(groups.flatMap((g) => g.links.map((l) => [l, g] as const)));
    const routes = spec.edges.flatMap((e): Route[] => {
      const chain = links.filter((l) => l.edge === e.id);
      const box = e.from === e.to ? rects.get(e.from) : undefined;
      if (e.from === e.to) return box === undefined || runs.hidden(e.id) ? [] : [loops.route(e, box)];
      if (chain.length === 0) {
        if (runs.hidden(e.id)) return [];
        const beside = below.route(e, frame, tracks, ports);
        return beside === undefined ? [] : [beside];
      }
      const points = simplify(
        chain.flatMap((l) => {
          const g = groupOf.get(l) as Group;
          return linkPoints(l, g, pieceOf.get(g), ports, frame);
        }),
      );
      const drawn = ranked.down.get(e.id) === false ? [...points].reverse() : points;
      return [
        {
          edge: e.id,
          points: drawn,
          shape: 'orthogonal',
          fromSide: sideOf(drawn, 'from'),
          toSide: sideOf(drawn, 'to'),
        },
      ];
    });
    const frames = spec.frames && fr.rects(loops.widened(rects), bandTop, gapTop);
    const loose = routes.flatMap((r, i) => {
      const e = r.shape === 'loop' ? spec.edges.find((k) => k.id === r.edge) : undefined;
      return e === undefined ? [] : loops.labels(e, r, i);
    });
    const real = new Map([...rects].filter(([n]) => !dummy(n)));
    const outer = (spec.frames ?? []).filter((f) => f.parent === undefined).map((f) => f.pad);
    const floor = outer.length > 0 ? m.left - Math.max(...outer) : 0;
    const laid = assemble(spec, {
      ranked,
      layers,
      rects,
      routes,
      seats,
      ports,
      groups,
      core,
      loose,
      ...(frames ? { frames: clearHeads(frames, spec, routes, real) } : {}),
    });
    return ln.around({ ...keptInside(laid, floor), crowded: laid.crowded }, x, width, m.top);
  };
  let placement = place();
  const around = below.around.flatMap((id): Around[] => {
    const at = (end: string) => below.ends.find((l) => l.edge === `${id}:${end}`);
    const [a, b] = [at('from'), at('to')];
    return a && b
      ? [{ id, layer: a.gap, from: placement.ports.bottom.get(a) ?? 0, to: placement.ports.bottom.get(b) ?? 0 }]
      : [];
  });
  const up = bendSides(around, groups, placement.ports);
  if (up.size > 0) {
    below = besideRoutes(ranked, layers, up, m.lead);
    placement = settle(placement.x);
  }
  const entries = links.map((l) => ({ upper: l.upper, lower: l.lower, x: placement.ports.top.get(l) ?? 0 }));
  if (fr.heads(entries, placement.flat)) placement = place();
  let { crowded, ...drawn } = draw(placement);
  if (seats.some((s) => crowded.includes(s.edge.id))) {
    grown = new Set(crowded);
    ({ crowded, ...drawn } = draw(placement));
  }
  return drawn;
}
