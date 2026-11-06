import type { Rect } from '@diagrist/core';
import type { CellLayout, EdgeText, GraphCells } from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { ArchEdge, ArchitectureModel } from '../model/types.js';
import { signedLabel } from './diff.js';
import { type Badge, MARK, type Mark, NUMBER_SIZE, TEXT_GAP } from './marks.js';

/** The flow numbers with the rectangles they cover, and the decision marks of a picture. */
export interface Signs {
  readonly badges: readonly Badge[];
  readonly numbered: readonly { readonly route: number; readonly rect: Rect }[];
  readonly marks: readonly Mark[];
}

/** The room texts keep from a flow number, besides the pad every sign keeps. */
const SIGN_ROOM = 2;

/** Where a decision mark stands inside the top right corner of its node, left of a replica tag. */
const CORNER = { dx: 20, dy: 13, replicas: 30 } as const;

/** Second line of an edge label: protocol, schedule, volume and promise, in this order, where given. */
export const detailLine = (e: ArchEdge): string => [e.via, e.schedule, e.volume, e.sla].filter(Boolean).join(' · ');

/**
 * The texts and signs of a picture's lines as the grid sets them: names with their diff sign and details, flow
 * numbers on their edges, decision marks beside the head of their edge and at the corner of their node, inside the
 * box with `marks: inside`; texts stand on their line where the look cuts them out of it.
 */
export function signsOf(
  model: ArchitectureModel,
  look: Look,
): Omit<GraphCells, 'cols' | 'rows' | 'cells' | 'adaptive' | 'metrics'> {
  const { metrics: m, options: o } = look;
  const texts = model.edges.map((e): EdgeText => {
    const detail = detailLine(e);
    const name = signedLabel(e.label, e.origin);
    return {
      edge: String(e.index),
      ...(name ? { name } : {}),
      ...(detail ? { detail } : {}),
      accent: e.step?.accent === true,
    };
  });
  const inside = o.marks === 'inside';
  const at = model.nodes.flatMap((n) => {
    if (!n.mark || !n.at) return [];
    const shift = n.replicas !== undefined || n.shape === 'job' ? CORNER.replicas : 0;
    return [{ node: n.id, ...(inside ? { inside: { dx: CORNER.dx + shift, dy: CORNER.dy } } : {}) }];
  });
  return {
    texts,
    preferFlat: o.edgeText.flat,
    ...(o.edgeText.place === 'onLine' ? { onLine: { pad: TEXT_GAP, avoid: [] } } : {}),
    signs: {
      numbers: {
        ...NUMBER_SIZE[o.numbers.form],
        room: SIGN_ROOM,
        offset: m.badgeOffset,
        edges: model.edges.flatMap((e) => (e.step ? [String(e.index)] : [])),
      },
      pins: { ...MARK, edges: model.edges.flatMap((e) => (e.mark ? [String(e.index)] : [])) },
      corners: { ...MARK, at },
    },
  };
}

/** The flow numbers and decision marks of a laid out picture, with what the model says of them. */
export function signsFrom(model: ArchitectureModel, laid: CellLayout, look: Look): Signs {
  const size = NUMBER_SIZE[look.options.numbers.form];
  const edge = (id: string) => model.edges[Number(id)];
  const badges = laid.numbers.map((b): Badge => {
    const step = edge(b.edge)?.step;
    return { n: step?.n ?? 0, route: b.route, x: b.x, y: b.y, accent: step?.accent === true };
  });
  const marks: Mark[] = [
    ...laid.pins.map((p) => ({ id: edge(p.edge)?.mark ?? '', x: p.x, y: p.y, route: p.route })),
    ...laid.corners.map((c) => ({ id: model.nodes.find((n) => n.id === c.node)?.mark ?? '', x: c.x, y: c.y })),
  ];
  const numbered = badges.map((b) => ({ route: b.route, rect: { x: b.x - size.w / 2, y: b.y - size.h / 2, ...size } }));
  return { badges, numbered, marks };
}
