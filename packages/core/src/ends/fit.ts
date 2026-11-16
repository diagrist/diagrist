import type { Point } from '../geometry.js';
import type { Shape } from '../scene.js';
import type { Marker, Styles } from '../styles.js';
import { reachOf } from './heads.js';
import { insetAt, type Outline, outlinesOf } from './outlines.js';
import { arrival, polylineData, polylineOf, shortenEnd, shortenStart } from './polyline.js';

/** A head's end of a line: the point the head's tip touches, and how much shorter the line gets there. */
interface Cut {
  readonly at: Point;
  readonly by: number;
}

/**
 * How far a tip reaches into the stroke it touches, so the rounding of the written coordinates to tenths leaves no
 * hairline between them.
 */
const TOUCH = 0.05;

/** Ends nearer than this are the same point. */
const SAME = 0.05;

const same = (a: Point, b: Point): boolean => Math.abs(a[0] - b[0]) < SAME && Math.abs(a[1] - b[1]) < SAME;

/** What the fitting needs of the style table: the markers by id, how far each reaches, and the outlines to touch. */
interface Context {
  readonly styles: Styles;
  readonly markers: ReadonlyMap<string, Marker>;
  readonly outlines: readonly Outline[];
}

/** How much the end of `points` gets shorter under the marker `id`: its reach and the stroke it ends on. */
function cutOf(points: readonly Point[], id: string | undefined, path: Shape, c: Context): Cut | undefined {
  const marker = id === undefined ? undefined : c.markers.get(id);
  if (marker === undefined) return undefined;
  const at = points.at(-1) as Point;
  const reach = reachOf(marker, c.styles.markerSize, c.styles);
  const inset = insetAt(at, arrival(points), c.outlines, path);
  return { at, by: reach + Math.max(0, inset - TOUCH) };
}

/** A path of the list as pieces of polylines, with the cuts its own markers make at its ends. */
interface Line {
  readonly shape: Extract<Shape, { kind: 'path' }>;
  readonly first: readonly Point[];
  readonly last: readonly Point[];
  readonly pieces: readonly (readonly Point[])[];
  readonly end?: Cut;
  readonly start?: Cut;
}

function linesOf(shapes: readonly Shape[], c: Context): Map<Shape, Line> {
  const lines = new Map<Shape, Line>();
  for (const shape of shapes) {
    if (shape.kind !== 'path' || shape.offset !== undefined) continue;
    const line = polylineOf(shape.d);
    if (line === undefined || line.closed) continue;
    const role = c.styles.roles[shape.role];
    const first = line.pieces[0] as Point[];
    const last = line.pieces.at(-1) as Point[];
    const end = cutOf(last, role?.marker, shape, c);
    const start = cutOf([...first].reverse(), role?.markerStart, shape, c);
    const ends = { ...(end ? { end } : {}), ...(start ? { start } : {}) };
    lines.set(shape, { shape, first, last, pieces: line.pieces, ...ends });
  }
  return lines;
}

/**
 * One list of shapes with its lines fitted: a line with a head ends where the head covers it, and the head's tip
 * touches the outer edge of the stroke the line ended on. Other lines of the list that end at the same point, such
 * as the halo below a line, a second line drawn backwards for a head at the start, or a line under a head carried
 * by an unpainted stub, end there too.
 */
function fitList(shapes: readonly Shape[], c: Context): Shape[] {
  const lines = linesOf(shapes, c);
  const cuts = [...lines.values()].flatMap((l) => [l.end, l.start].filter((cut) => cut !== undefined));
  const cutAt = (p: Point): number => Math.max(0, ...cuts.filter((cut) => same(cut.at, p)).map((cut) => cut.by));
  return shapes.map((shape): Shape => {
    if (shape.kind === 'group') return { ...shape, children: fitList(shape.children, c) };
    const line = lines.get(shape);
    if (line === undefined) return shape;
    const end = line.end?.by ?? cutAt(line.last.at(-1) as Point);
    const start = line.start?.by ?? cutAt(line.first[0] as Point);
    if (end === 0 && start === 0) return shape;
    const pieces = line.pieces.map((p, i) => (i === line.pieces.length - 1 ? shortenEnd(p, end) : p));
    return { ...line.shape, d: polylineData(pieces.map((p, i) => (i === 0 ? shortenStart(p, start) : p))) };
  });
}

/**
 * The scene's shapes with the ends of its lines fitted to their heads (see `fitList`), so a filled head shows no
 * line in its tip and every head touches the outline it points at. Lines whose path data is not a polyline in
 * absolute commands stay as they are.
 */
export function fitEnds(shapes: readonly Shape[], styles: Styles): readonly Shape[] {
  const markers = new Map(styles.markers.map((m) => [m.id, m]));
  return fitList(shapes, { styles, markers, outlines: outlinesOf(shapes, styles) });
}
