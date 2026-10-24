import { type Rect, textWidth } from '@diagrist/core';
import type { Behaviour, Vertex } from '../diagram.js';
import type { StateModel } from '../model.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';

/** A guard in brackets; one already in brackets stays as it is. */
export const guardText = (when: string): string => (/^\[.*\]$/.test(when.trim()) ? when.trim() : `[${when.trim()}]`);

/**
 * The UML label `trigger [guard] / effect`, empty without all three; in a protocol state machine
 * `[precondition] operation / [postcondition]`.
 */
export function transitionLabel(t: Behaviour, protocol = false): string {
  const guard = t.when ? guardText(t.when) : undefined;
  const effect = t.do ? `/ ${t.do}` : undefined;
  const parts = protocol ? [guard, t.on, t.post ? `/ ${guardText(t.post)}` : effect] : [t.on, guard, effect];
  return parts.filter(Boolean).join(' ');
}

/** The name in the box; a submachine state names the machine it calls after it: `Name : Machine`. */
export const stateName = (v: Vertex): string => (v.submachine ? `${v.label ?? ''} : ${v.submachine}` : (v.label ?? ''));

/** Lines of the compartment in UML order: entry, do, exit, deferred events, then the internal transitions. */
export function stateLines(m: StateModel, v: Vertex): string[] {
  return [
    v.entry ? `entry / ${v.entry}` : '',
    v.do ? `do / ${v.do}` : '',
    v.exit ? `exit / ${v.exit}` : '',
    ...v.defer.map((e) => `${e} / defer`),
    ...m.diagram.internals.filter((i) => i.state === v.id).map((i) => transitionLabel(i)),
  ].filter(Boolean);
}

/** Sides of a pseudostate: circles and diamond square, bars across the flow; undefined for a state. */
export function pseudoSize(v: Vertex, right: boolean): { w: number; h: number } | undefined {
  const square = (n: number) => ({ w: n, h: n });
  switch (v.kind) {
    case 'state':
      return undefined;
    case 'fork':
    case 'join':
      return right ? { w: S.barH, h: S.barMin } : { w: S.barMin, h: S.barH };
    case 'entrypoint':
    case 'exitpoint':
      return square(S.point);
    case 'region':
      return square(0);
    default:
      return square(S[v.kind]);
  }
}

/** Width: the name bold, compartment lines in member font, rounded up to the grid. */
export function stateWidth(m: StateModel, v: Vertex): number {
  const pseudo = pseudoSize(v, m.diagram.direction === 'right');
  if (pseudo) return pseudo.w;
  const texts = [textWidth(stateName(v), F.name), ...stateLines(m, v).map((l) => textWidth(l, F.member))];
  const rim = v.submachine ? 4 * S.point : 0;
  return Math.max(S.minW, Math.ceil((Math.max(...texts) + 2 * S.padX + rim) / S.grid) * S.grid);
}

export function stateHeight(m: StateModel, v: Vertex): number {
  const pseudo = pseudoSize(v, m.diagram.direction === 'right');
  if (pseudo) return pseudo.h;
  const lines = stateLines(m, v).length;
  const icon = lines && v.submachine ? S.subH + S.subInset : 0;
  return lines ? S.headH + 2 * S.sectionPad + lines * S.lineH + icon : S.nameH;
}

/** Name, divider, compartment lines and submachine symbol of a state; a pseudostate's name beside its symbol. */
export interface StateArt {
  readonly name?: {
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly anchor: 'middle' | 'start' | 'end';
  };
  readonly divider?: number;
  readonly lines: readonly { readonly text: string; readonly x: number; readonly y: number }[];
  readonly submachine?: Rect;
}

export function stateArt(m: StateModel, v: Vertex, rect: Rect): StateArt {
  if (v.kind !== 'state') {
    if (!v.label) return { lines: [] };
    const at = { x: rect.x + rect.w + S.pseudoLabelGap, y: rect.y - S.pseudoLabelGap / 2 };
    return { name: { text: v.label, ...at, anchor: 'start' }, lines: [] };
  }
  const lines = stateLines(m, v);
  const headH = lines.length ? S.headH : rect.h;
  const icon = v.submachine
    ? {
        submachine: {
          x: rect.x + rect.w - S.subInset - S.subW,
          y: rect.y + rect.h - S.subInset - S.subH,
          w: S.subW,
          h: S.subH,
        },
      }
    : {};
  const name = {
    text: stateName(v),
    x: rect.x + rect.w / 2,
    y: rect.y + headH / 2 + S.labelDy,
    anchor: 'middle' as const,
  };
  if (!lines.length) return { name, lines: [], ...icon };
  const top = rect.y + headH + S.sectionPad;
  const x = rect.x + S.padX + (v.submachine ? S.point / 2 : 0);
  return {
    name,
    divider: rect.y + headH,
    lines: lines.map((text, i) => ({ text, x, y: top + i * S.lineH + F.member.size + 1 })),
    ...icon,
  };
}
