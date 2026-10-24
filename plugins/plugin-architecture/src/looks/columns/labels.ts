import { domId, type Font, type Point, type Shape, textWidth } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import type { ArchitectureLayout } from '../../layout/index.js';
import type { Badge } from '../../layout/marks.js';
import type { Metrics } from '../../layout/metrics.js';
import { detailLine } from '../../layout/spec.js';
import type { ArchEdge, ArchitectureModel } from '../../model/types.js';
import { labelledRoutes } from '../../scene/labels.js';
import type { Focus } from './focus.js';
import { LABEL_FONT } from './metrics.js';

/** Radius of a flow number and how far its digit sits below the centre. */
const NUMBER = { r: 8.5, dy: 3.5 } as const;
const MARK = { w: 24, h: 16, dy: 3.3 } as const;
/** The least room between a flow number and the box its line starts at. */
const START_ROOM = 3;

/** A flow number seated at the very start of its line moves along it until it keeps `START_ROOM` from the box. */
function clearOfStart(b: Badge, points: readonly Point[]): Point {
  const [a, c] = points;
  if (!a || !c) return [b.x, b.y];
  const along = a[1] === c[1] ? 0 : 1;
  const sign = Math.sign(c[along] - a[along]);
  const at = along === 0 ? b.x : b.y;
  const least = a[along] + sign * (NUMBER.r + START_ROOM);
  if ((at - least) * sign >= 0 || (along === 0 ? b.y !== a[1] : b.x !== a[0])) return [b.x, b.y];
  return along === 0 ? [least, b.y] : [b.x, least];
}

/** Room between the name and the protocol where both share a line. */
const APART = 8;

type Face = 'verb' | 'words' | 'detail';
interface Piece {
  readonly text: string;
  readonly face: Face;
}

/** The pieces of one line that starts at `offset` of the edge's text: verb bold, other words, protocol in mono. */
function piecesOf(l: EdgeLabel, offset: number, e: ArchEdge): Piece[] {
  if (l.part === 'detail') return [{ text: l.text, face: 'detail' }];
  const name = e.label ?? '';
  const verb = name.includes(' ') ? name.indexOf(' ') : name.length;
  const detail = detailLine(e) && name ? name.length + 3 : name ? Number.POSITIVE_INFINITY : 0;
  const cuts = [0, verb, name.length, detail, Number.POSITIVE_INFINITY];
  const faces: (Face | undefined)[] = ['verb', 'words', undefined, 'detail'];
  return faces.flatMap((face, i) => {
    const from = Math.max(0, (cuts[i] as number) - offset);
    const to = Math.min(l.text.length, (cuts[i + 1] as number) - offset);
    return face && to > from ? [{ text: l.text.slice(from, to), face }] : [];
  });
}

/** One line of an edge's text as pieces set side by side, as wide as measured or narrower. */
function lineShapes(l: EdgeLabel, pieces: readonly Piece[], context: boolean, m: Metrics): Shape[] {
  const regular: Font = { ...LABEL_FONT, weight: 400 };
  const mono = pieces.reduce((w, p) => w + (p.face === 'detail' ? textWidth(p.text, m.fonts.tech) : 0), 0);
  const sans = pieces.reduce((w, p) => w + (p.face === 'detail' ? textWidth(p.text, regular) : 0), 0);
  const words = pieces.filter((p) => p.face !== 'detail');
  const rest = words.reduce((w, p) => w + textWidth(p.text, p.face === 'verb' ? LABEL_FONT : regular), 0);
  const apart = words.length > 0 && words.length < pieces.length ? APART : 0;
  const fits = rest + apart + mono <= l.box.w;
  const total = rest + apart + (fits ? mono : sans);
  let x = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - total : l.x - total / 2;
  const suffix = context ? 'Context' : '';
  return pieces.flatMap((p): Shape[] => {
    const font = p.face === 'verb' ? LABEL_FONT : p.face === 'detail' && fits ? m.fonts.tech : regular;
    const lead = textWidth(p.text.slice(0, p.text.length - p.text.trimStart().length), font);
    const at = x + lead + (p.face === 'detail' ? apart : 0);
    x += textWidth(p.text, font) + (p.face === 'detail' ? apart : 0);
    const text = p.text.trim();
    if (!text) return [];
    const role = p.face === 'verb' ? 'edgeVerb' : p.face === 'detail' && fits ? 'edgeDetail' : 'edgeWords';
    const fontRole = p.face === 'detail' && fits ? 'tech' : 'label';
    return [{ kind: 'text', x: at, y: l.y, text, role: `${role}${suffix}`, font: fontRole }];
  });
}

/** The texts of one route beside its line, without ground behind them. */
function routeTexts(own: readonly EdgeLabel[], e: ArchEdge | undefined, context: boolean, m: Metrics): Shape[] {
  if (!e) return [];
  const detail = detailLine(e);
  const full = [e.label, detail].filter(Boolean).join(' · ');
  let cursor = 0;
  return own.flatMap((l) => {
    const offset = l.part === 'detail' ? 0 : Math.max(0, full.indexOf(l.text, cursor));
    if (l.part !== 'detail') cursor = offset + l.text.length;
    return lineShapes(l, piecesOf(l, offset, e), context, m);
  });
}

/** Per labelled route a group with its texts, flow number and marks; after them the marks at nodes. */
export function columnsLabelShapes(
  model: ArchitectureModel,
  layout: ArchitectureLayout,
  focus: Focus,
  m: Metrics,
): Shape[] {
  const edgeOf = (route: number) => model.edges[Number(layout.routes[route]?.edge)];
  const groups = labelledRoutes(layout).map((i): Shape => {
    const e = edgeOf(i);
    const context = focus.edge(e);
    const own = layout.labels.filter((l) => l.route === i);
    const numbers = layout.badges
      .filter((b) => b.route === i)
      .flatMap((b) => {
        const [x, y] = clearOfStart(b, layout.routes[i]?.points ?? []);
        return numberSign(String(b.n), x, y, context);
      });
    const marks = layout.marks.filter((k) => k.route === i).flatMap((k) => markSign(k.id, k.x, k.y));
    return { kind: 'group', id: domId.label(i), children: [...routeTexts(own, e, context, m), ...numbers, ...marks] };
  });
  const nodeMarks = layout.marks.filter((k) => k.route === undefined).flatMap((k) => markSign(k.id, k.x, k.y));
  return [...groups, ...nodeMarks];
}

/** A mark for the side column, the same square as in the picture. */
export const markSign = (id: string, x: number, y: number): Shape[] => [
  { kind: 'rect', x: x - MARK.w / 2, y: y - MARK.h / 2, w: MARK.w, h: MARK.h, role: 'mark' },
  { kind: 'text', x, y: y + MARK.dy, text: id, role: 'markText', font: 'mark', anchor: 'middle' },
];

/** A flow number for the side column, the same circle as on the edges. */
export const numberSign = (n: string, x: number, y: number, context: boolean): Shape[] => [
  { kind: 'circle', cx: x, cy: y, r: NUMBER.r, role: context ? 'badgeContext' : 'badge' },
  { kind: 'text', x, y: y + NUMBER.dy, text: n, role: 'badgeText', font: 'badge', anchor: 'middle' },
];
