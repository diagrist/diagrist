import type { Rect } from '@diagrist/core';
import { cx, cy, wrapTwo } from '@diagrist/layout-grid';
import type { ActivityNode } from '../diagram.js';
import type { NodeKind } from '../grammar/values.js';
import { expansionSize, expansionText } from './expansion.js';
import { ACT, SIZE, widthOf } from './metrics.js';
import type { ActivityText } from './regions.js';

/** A pin: a square on the edge of an action, the object type beside it. */
export interface PinArt {
  readonly rect: Rect;
  readonly text: ActivityText;
}

/** Coordinates inside an activity node; the scene only draws them. */
export interface ActivityArt {
  /** Kind of the node; `expansion` is an expansion node on the frame of a region. */
  readonly node: NodeKind | 'expansion';
  /** Text in the box of an action, object or signal, one or two lines. */
  readonly lines: readonly ActivityText[];
  /** Text beside the symbol: question at the diamond, time at the hourglass, name of an expansion node. */
  readonly side: ActivityText | undefined;
  /** Call behavior action: the rake at the bottom right of the box. */
  readonly rake?: Rect;
  /** Input and output pins on the edge, set after routing. */
  readonly pins?: readonly PinArt[];
}

/**
 * Size for the placement: `w` by `h` is the symbol, `span` the width with side text, centred on the symbol. `left`
 * and `right` reach from the centre to the edge with side text.
 */
export interface ActivitySize {
  readonly w: number;
  readonly h: number;
  readonly span: number;
  readonly left: number;
  readonly right: number;
}

const BOXED = new Set<NodeKind>(['action', 'object', 'send', 'accept', 'datastore', 'buffer']);
/** Data store and buffer are object nodes with a keyword above their name (UML 2.5.1, 15.4.4). */
const KEYWORD: Partial<Record<NodeKind, string>> = { datastore: '«datastore»', buffer: '«centralBuffer»' };
const SIDE_TEXT = new Set<NodeKind>(['decision', 'merge', 'wait']);

/** Lines of a box text; long texts wrap once. An object carries its state as a line of its own. */
function boxLines(n: ActivityNode): string[] {
  const wrapped: string[] = widthOf.node(n.label) > ACT.wrapW ? wrapTwo(n.label) : [n.label];
  const keyword = KEYWORD[n.kind];
  if (keyword) return [keyword, ...wrapped];
  return n.kind === 'object' && n.state ? [...wrapped, `[${n.state}]`] : wrapped;
}

/** Width for several pins on one side: per pin its square and name, air between and outside. */
function pinsWidth(names: readonly string[]): number {
  if (names.length < 2) return 0;
  return names.reduce((w, s) => w + ACT.pin + ACT.pinGap + widthOf.label(s), 0) + (names.length + 1) * ACT.pinGap * 2;
}

function symbol(kind: NodeKind): { w: number; h: number } {
  switch (kind) {
    case 'initial':
      return { w: 2 * ACT.initialR, h: 2 * ACT.initialR };
    case 'final':
    case 'flowfinal':
      return { w: 2 * ACT.finalR, h: 2 * ACT.finalR };
    case 'decision':
    case 'merge':
      return { w: ACT.diamond, h: ACT.diamond };
    case 'fork':
    case 'join':
      return { w: ACT.barMinW, h: ACT.bar };
    case 'wait':
      return { w: ACT.hourglassW, h: ACT.hourglassH };
    default:
      return { w: ACT.actionMinW, h: ACT.actionH };
  }
}

/** Size of a node from its measured texts. */
export function activitySize(n: ActivityNode): ActivitySize {
  if (n.port) return expansionSize(n.port);
  const base = symbol(n.kind);
  if (BOXED.has(n.kind)) {
    const lines = boxLines(n);
    const text = Math.max(...lines.map((l) => widthOf.node(l)));
    const tip = n.kind === 'send' || n.kind === 'accept' ? ACT.signalTip : 0;
    const call = n.call && n.kind === 'action' ? ACT.callExtra : 0;
    const pins = Math.max(pinsWidth(n.inputs), pinsWidth(n.outputs));
    const w = Math.max(ACT.actionMinW, Math.ceil(Math.max(text + 2 * ACT.actionPadX + tip + call, pins) / 8) * 8);
    const h = ACT.actionH + (lines.length - 1) * ACT.lineH;
    return { w, h, span: w, left: w / 2, right: w / 2 };
  }
  if (SIDE_TEXT.has(n.kind) && n.label !== '') {
    const side = widthOf.label(n.label) + ACT.sideGap;
    return { ...base, span: base.w + 2 * side, left: base.w / 2, right: base.w / 2 + side };
  }
  return { ...base, span: base.w, left: base.w / 2, right: base.w / 2 };
}

/** Box texts centred, side texts right of the symbol (at a diamond at its top right, clear of the corners). */
export function activityArt(n: ActivityNode, rect: Rect): ActivityArt {
  if (n.port) return { node: 'expansion', lines: [], side: expansionText(n.port, rect) };
  if (BOXED.has(n.kind)) {
    const lines = boxLines(n);
    const tip = n.kind === 'send' ? -ACT.signalTip / 2 : n.kind === 'accept' ? ACT.signalTip / 2 : 0;
    const top = cy(rect) - ((lines.length - 1) * ACT.lineH) / 2 + SIZE.node / 3;
    const rake = {
      x: rect.x + rect.w - ACT.rakeInset - ACT.rakeW,
      y: rect.y + rect.h - ACT.rakeInset - ACT.rakeH,
      w: ACT.rakeW,
      h: ACT.rakeH,
    };
    return {
      node: n.kind,
      lines: lines.map((text, i) => ({ text, x: cx(rect) + tip, y: top + i * ACT.lineH, anchor: 'middle' })),
      side: undefined,
      ...(n.call && n.kind === 'action' ? { rake } : {}),
    };
  }
  const diamond = n.kind !== 'wait';
  const side: ActivityText | undefined =
    SIDE_TEXT.has(n.kind) && n.label !== ''
      ? {
          text: n.label,
          x: rect.x + rect.w + ACT.sideGap - (diamond ? rect.w / 4 : 0),
          y: diamond ? rect.y - 2 : cy(rect) + SIZE.label / 3,
          anchor: 'start',
        }
      : undefined;
  return { node: n.kind, lines: [], side };
}
