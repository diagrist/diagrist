import { type Font, textWidth } from '@diagrist/core';
import type { ArchNode, Look } from '../model/types.js';
import type { Metrics } from './metrics.js';

/** What measuring needs: the look and its measures. */
export interface Sizing {
  readonly look: Look;
  readonly m: Metrics;
}

/** How a node is drawn in `look=blocks`: a filled box, a lying tube, a standing cylinder, or only its name. */
export type BlockForm = 'box' | 'pipe' | 'db' | 'text';

/** Least width of a block by form: cylinders and tubes need area even without text. */
const BLOCK_MIN: Readonly<Record<BlockForm, number>> = { box: 64, db: 112, pipe: 160, text: 0 };

const BLOCK_PAD = 8;
const MARKER_ROOM = 40;
const STATUS_ROOM = 90;
/** Room for the status dot after the name in `look=paper`. */
const DOT_ROOM = 16;
const TUBE = { top: 20, arrow: 16, gap: 8, body: 34 } as const;
const DB_EXTRA = 16;
const TEXT_PAD = 10;

export function blockForm(n: ArchNode): BlockForm {
  if (n.form === 'text') return 'text';
  if (n.shape === 'queue') return 'pipe';
  return n.shape === 'db' ? 'db' : 'box';
}

/** In `look=cards` a node is a circle with its name below when it says `form=circle`, or is a store without form. */
export function isCircle(n: ArchNode, look: Look): boolean {
  if (look !== 'cards' || n.keyword === 'person') return false;
  return (
    n.form === 'circle' || (n.form === undefined && (n.shape === 'db' || n.shape === 'queue' || n.shape === 'store'))
  );
}

/**
 * What the second line of a node is: a technology on containers and components, as C4 writes it there, and a
 * description on people, systems and neutral nodes. It names the font role and the text role alike.
 */
export const secondLineRole = (n: ArchNode): 'tech' | 'description' =>
  n.keyword === 'container' || n.keyword === 'component' ? 'tech' : 'description';

/** The font of the second line of a node; the standard look sets technology and description alike. */
export const secondLine = (n: ArchNode, m: Metrics): Font => m.fonts[secondLineRole(n)];

const roundUp = (value: number, grid: number): number => Math.ceil(value / grid) * grid;

/** The width a node needs for its texts, icon, status and corner marks, on the grid; centred texts in cards and blocks. */
export function nodeWidth(n: ArchNode, { look, m }: Sizing): number {
  const label = textWidth(n.label, m.fonts.name);
  const tech = textWidth(n.tech ?? '', secondLine(n, m));
  if (look === 'blocks') return roundUp(Math.max(label, tech, 0) + 2 * (m.nodePad + BLOCK_PAD), m.grid);
  if (look === 'cards') {
    if (isCircle(n, look)) return roundUp(Math.max(label, tech, 2 * m.circleR), m.grid);
    return roundUp(Math.max(label, tech, 0) + 2 * m.nodePad, m.grid);
  }
  const icon = n.icon || look === 'panel' ? m.iconSize + m.iconGap : 0;
  const corner = n.replicas || n.shape === 'job' ? MARKER_ROOM : 0;
  const marker = corner + ((look === 'paper' || look === 'panel') && n.mark ? MARKER_ROOM : 0);
  const paper = look === 'paper';
  const dot = paper && n.status ? DOT_ROOM : 0;
  const detail = tech + (n.status && !paper ? STATUS_ROOM : 0);
  return roundUp(Math.max(label + marker + dot, detail, 0 - icon) + icon + 2 * m.nodePad, m.grid);
}

/** The height of a node: `height`, else the row height; in blocks tubes and cylinders are higher, texts lower. */
export function nodeHeight(n: ArchNode, { look, m }: Sizing): number {
  if (n.height !== undefined) return n.height;
  if (look !== 'blocks') return m.nodeH;
  const form = blockForm(n);
  const lines = n.tech !== undefined ? 2 : 1;
  if (form === 'pipe')
    return TUBE.top + TUBE.arrow + TUBE.gap + TUBE.body + TUBE.gap + lines * m.nodeLineH + m.nodeLineH / 2;
  if (form === 'db') return m.nodeH + DB_EXTRA;
  if (form === 'text') return m.nodeLineH + TEXT_PAD;
  return m.nodeH;
}

/** Measures of a lying tube in blocks, for the drawing: arrow above, body below it. */
export const TUBE_MEASURES = TUBE;

/** Own width: `width`, else in blocks the width of the content, unless the node spans columns and fills them. */
export function fixedWidth(n: ArchNode, sizing: Sizing): number | undefined {
  if (n.width !== undefined) return n.width;
  const spans = n.span !== undefined && n.span.col !== n.at?.col;
  if (sizing.look !== 'blocks' || spans) return undefined;
  return Math.max(BLOCK_MIN[blockForm(n)], nodeWidth(n, sizing));
}
