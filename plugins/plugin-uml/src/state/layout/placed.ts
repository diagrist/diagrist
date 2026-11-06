import { type Placed, type Rect, textWidth } from '@diagrist/core';
import {
  type EdgeLabel,
  type GridLayout,
  overlaps,
  type PlacedGroup,
  type PlacedSpec,
  placedOf,
  type Route,
} from '@diagrist/layout-grid';
import { homed } from '../../shared/homed.js';
import type { NoteArt } from '../../shared/notes.js';
import type { StateModel } from '../model.js';
import { stateArt } from './box.js';
import { homeOf } from './containers.js';
import { STATE_FONTS as F } from './metrics.js';
import { borderOf, hostOf } from './points/geometry.js';
import type { PointName } from './points/names.js';
import { regionArt } from './regions.js';

/** Vertices drawn as circles; the diamond of a choice and the bars stay boxes. */
const ROUND: ReadonlySet<string> = new Set(['initial', 'final', 'junction', 'history', 'entrypoint', 'exitpoint']);

/** What the layout of a state machine hands to `placedState`. */
export interface StatePlacing {
  readonly spec: PlacedSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly names: ReadonlyMap<string, PointName>;
  readonly notes: readonly NoteArt[];
  /** The orthogonal regions as the layout filled their states with them. */
  readonly regions: readonly PlacedGroup[];
}

/** The rectangle of a text as the scene writes it, by its anchor, in the note font or `font`. */
function nameRect(
  name: { readonly text: string; readonly x: number; readonly y: number; readonly anchor: string },
  font = F.note,
) {
  const w = textWidth(name.text, font);
  const x = name.anchor === 'start' ? name.x : name.anchor === 'end' ? name.x - w : name.x - w / 2;
  return { x, y: name.y - font.size, w, h: font.size + 2 } satisfies Rect;
}

/**
 * The orthogonal regions as frames in their state, each with its name at the top left as the head of the frame
 * (`<region>.name`), as the scene draws them.
 */
function placedRegions(m: StateModel, p: StatePlacing): Placed[] {
  return p.grid.groups.flatMap((g) => {
    const names = regionArt(g, m, p.regions).names;
    return p.regions.flatMap((r): Placed[] => {
      const v = m.vertices.get(r.id);
      if (v?.parent !== g.id) return [];
      const span = { span: v.span };
      const name = names.find((n) => n.x >= r.rect.x && n.x <= r.rect.x + r.rect.w && n.y >= r.rect.y);
      const head = name && nameRect({ ...name, anchor: 'start' }, F.label);
      return [
        { key: r.id, kind: 'frame', rect: r.rect, within: g.id, ...span },
        ...(head ? [{ key: `${r.id}.name`, kind: 'text' as const, rect: head, within: r.id, ...span }] : []),
      ];
    });
  });
}

/**
 * What a state machine placed, for the kernel's check (ADR 0010, 0020): states, frames and transition labels from the
 * grid, orthogonal regions as frames with their names, circles with their outline, entry and exit points on the
 * border of their state, or of the region they touch where the state has regions, the names beside pseudostates as
 * texts, and notes. What stands in a region belongs into it; texts and notes belong into the innermost frame or region
 * around them.
 */
export function placedState(m: StateModel, p: StatePlacing): Placed[] {
  const parentOf = (region: string) => m.vertices.get(region)?.parent;
  const parted = new Set(p.regions.map((r) => parentOf(r.id)));
  const regionAt = (host: string, r: Rect) =>
    p.regions.find((g) => parentOf(g.id) === host && overlaps(g.rect, r))?.id ?? host;
  const vertices = placedOf(p.spec, p.grid, p.routes, p.labels).map((q): Placed => {
    if (q.kind === 'text' && q.within !== undefined && parted.has(q.within)) {
      const { within: _, ...loose } = q;
      return loose;
    }
    const v = q.kind === 'box' ? m.vertices.get(q.key) : undefined;
    const home = q.within === undefined ? undefined : homeOf(m, q.key);
    const inRegion = home !== undefined && m.kind(home) === 'region' ? { within: home } : {};
    if (!v) return { ...q, ...inRegion };
    const outline = ROUND.has(v.kind) ? { outline: 'ellipse' as const } : {};
    const host = borderOf(m, v.id) ?? hostOf(m, v.id);
    if (host === undefined) return { ...q, ...outline, ...inRegion };
    const { within: _, ...free } = q;
    return { ...free, ...outline, on: parted.has(host) ? regionAt(host, q.rect) : host, span: v.span };
  });
  const names = p.grid.nodes.flatMap((n): Placed[] => {
    const v = m.vertices.get(n.id);
    const name = v && v.kind !== 'state' ? (p.names.get(n.id) ?? stateArt(m, v, n.rect).name) : undefined;
    return v && name ? [{ key: `${n.id}.name`, kind: 'text', rect: nameRect(name), span: v.span }] : [];
  });
  const notes = p.notes.map((n, i): Placed => ({ key: `${n.on}.note.${i + 1}`, kind: 'box', rect: n.rect }));
  const area = (r: Rect) => r.w * r.h;
  const groups = [...p.grid.groups, ...p.regions].sort((a, b) => area(b.rect) - area(a.rect));
  const regions = placedRegions(m, p);
  return [...regions, ...vertices, ...names, ...notes].map((q) => homed(q, { ...p.grid, groups }));
}
