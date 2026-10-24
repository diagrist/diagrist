import { type Placed, type Rect, textWidth } from '@diagrist/core';
import { type EdgeLabel, type GridLayout, type GridSpec, placedOf, type Route } from '@diagrist/layout-grid';
import { homed } from '../../shared/homed.js';
import type { NoteArt } from '../../shared/notes.js';
import type { StateModel } from '../model.js';
import { stateArt } from './box.js';
import { STATE_FONTS as F } from './metrics.js';
import { borderOf, hostOf } from './points/geometry.js';
import type { PointName } from './points/names.js';

/** Vertices drawn as circles; the diamond of a choice and the bars stay boxes. */
const ROUND: ReadonlySet<string> = new Set(['initial', 'final', 'junction', 'history', 'entrypoint', 'exitpoint']);

/** What the layout of a state machine hands to `placedState`. */
export interface StatePlacing {
  readonly spec: GridSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly names: ReadonlyMap<string, PointName>;
  readonly notes: readonly NoteArt[];
}

/** The rectangle of a name beside a pseudostate, as the scene writes it in the note font. */
function nameRect(name: { readonly text: string; readonly x: number; readonly y: number; readonly anchor: string }) {
  const w = textWidth(name.text, F.note);
  const x = name.anchor === 'start' ? name.x : name.anchor === 'end' ? name.x - w : name.x - w / 2;
  return { x, y: name.y - F.note.size, w, h: F.note.size + 2 } satisfies Rect;
}

/**
 * What a state machine placed, for the kernel's check (ADR 0010, 0020): states, frames and transition labels from the
 * grid, circles with their outline, entry and exit points on the border of their state, the names beside pseudostates
 * as texts, and notes. Texts and notes belong into the innermost frame around them.
 */
export function placedState(m: StateModel, p: StatePlacing): Placed[] {
  const vertices = placedOf(p.spec, p.grid, p.routes, p.labels).map((q): Placed => {
    const v = q.kind === 'box' ? m.vertices.get(q.key) : undefined;
    if (!v) return q;
    const outline = ROUND.has(v.kind) ? { outline: 'ellipse' as const } : {};
    const on = borderOf(m, v.id) ?? hostOf(m, v.id);
    if (on === undefined) return { ...q, ...outline };
    const { within: _, ...free } = q;
    return { ...free, ...outline, on, span: v.span };
  });
  const names = p.grid.nodes.flatMap((n): Placed[] => {
    const v = m.vertices.get(n.id);
    const name = v && v.kind !== 'state' ? (p.names.get(n.id) ?? stateArt(m, v, n.rect).name) : undefined;
    return v && name ? [{ key: `${n.id}.name`, kind: 'text', rect: nameRect(name), span: v.span }] : [];
  });
  const notes = p.notes.map((n, i): Placed => ({ key: `${n.on}.note.${i + 1}`, kind: 'box', rect: n.rect }));
  return [...vertices, ...names, ...notes].map((q) => homed(q, p.grid));
}
