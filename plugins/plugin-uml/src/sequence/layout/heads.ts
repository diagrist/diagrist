import type { Rect } from '@diagrist/core';
import type { Participant } from '../diagram.js';
import { isFigure, type SeqCtx } from './text.js';
import type { SeqHeadArt, SeqRole, SeqShape } from './types.js';

/** Stick figure in a grid of 34 units: head, body, arms, legs. */
const ACTOR = { headR: 5, headY: 6, neck: 11, hip: 22, arms: 15, armW: 10, foot: 33, legW: 9 } as const;
/** Offset of the control arrow and the boundary bar of the robustness symbols. */
const MARK = 4;
const BAR_GAP = 6;

/** Baselines of the head texts: stereotype above, name below. */
function texts(p: Participant, cx: number, nameY: number, c: SeqCtx): SeqShape[] {
  const out: SeqShape[] = [];
  if (p.stereotype)
    out.push({
      kind: 'text',
      at: { x: cx, y: nameY - c.s.stereoH },
      text: `«${p.stereotype}»`,
      role: 'stereo',
      anchor: 'middle',
    });
  out.push({ kind: 'text', at: { x: cx, y: nameY }, text: p.label, role: 'name', anchor: 'middle' });
  return out;
}

/** Cylinder for databases, lying tube for queues, a box otherwise. */
function body(p: Participant, r: Rect, c: SeqCtx, role: SeqRole, edge: SeqRole): SeqShape[] {
  const ry = c.s.symbolR / 2;
  const [l, t, w, h] = [r.x, r.y, r.w, r.h];
  if (p.kind === 'database')
    return [
      {
        kind: 'path',
        d: `M${l} ${t + ry} A${w / 2} ${ry} 0 0 1 ${l + w} ${t + ry} V${t + h - ry} A${w / 2} ${ry} 0 0 1 ${l} ${t + h - ry} Z`,
        role,
      },
      { kind: 'path', d: `M${l} ${t + ry} A${w / 2} ${ry} 0 0 0 ${l + w} ${t + ry}`, role: edge },
    ];
  if (p.kind === 'queue')
    return [
      {
        kind: 'path',
        d: `M${l + ry} ${t} H${l + w - ry} A${ry} ${h / 2} 0 0 1 ${l + w - ry} ${t + h} H${l + ry} A${ry} ${h / 2} 0 0 1 ${l + ry} ${t} Z`,
        role,
      },
      { kind: 'path', d: `M${l + w - ry} ${t} A${ry} ${h / 2} 0 0 0 ${l + w - ry} ${t + h}`, role: edge },
    ];
  return [{ kind: 'rect', rect: r, role }];
}

/** Stick figure or robustness symbol (boundary, control, entity) in the area `figureH` from `top`. */
function figure(p: Participant, cx: number, top: number, c: SeqCtx, ext: boolean): SeqShape[] {
  const s = c.s;
  const fill: SeqRole = ext ? 'figureExternal' : 'figure';
  const stroke: SeqRole = ext ? 'strokeExternal' : 'stroke';
  const k = s.figureH / ACTOR.foot;
  const at = (v: number) => top + v * k;
  if (p.kind === 'actor')
    return [
      { kind: 'circle', cx, cy: at(ACTOR.headY), r: ACTOR.headR * k, role: fill },
      {
        kind: 'path',
        d: `M${cx} ${at(ACTOR.neck)} V${at(ACTOR.hip)} M${cx - ACTOR.armW * k} ${at(ACTOR.arms)} H${cx + ACTOR.armW * k} M${cx - ACTOR.legW * k} ${at(ACTOR.foot)} L${cx} ${at(ACTOR.hip)} L${cx + ACTOR.legW * k} ${at(ACTOR.foot)}`,
        role: stroke,
      },
    ];
  const R = s.symbolR;
  const cy = top + s.figureH / 2;
  if (p.kind === 'boundary') {
    const ox = cx + (BAR_GAP + MARK) / 2;
    const bar = ox - R - BAR_GAP;
    return [
      { kind: 'path', d: `M${bar} ${cy - R} V${cy + R} M${bar} ${cy} H${ox - R}`, role: stroke },
      { kind: 'circle', cx: ox, cy, r: R, role: fill },
    ];
  }
  const extra: SeqShape =
    p.kind === 'control'
      ? {
          kind: 'path',
          d: `M${cx + MARK} ${cy - R - MARK} L${cx} ${cy - R} L${cx + MARK} ${cy - R + MARK}`,
          role: stroke,
        }
      : { kind: 'path', d: `M${cx - R} ${cy + R} H${cx + R}`, role: stroke };
  return [{ kind: 'circle', cx, cy, r: R, role: fill }, extra];
}

/** Head of a lifeline; `top` is its upper edge, `size` comes from measuring the columns. */
export function headArt(
  p: Participant,
  cx: number,
  top: number,
  size: { readonly w: number; readonly h: number },
  c: SeqCtx,
): SeqHeadArt {
  const s = c.s;
  const rect: Rect = { x: cx - size.w / 2, y: top, w: size.w, h: size.h };
  const ext = p.external === true;
  const nameDy = Math.round(c.nameSize / 3);
  if (isFigure(p)) {
    const nameY = top + s.figureH + (p.stereotype ? s.stereoH : 0) + s.lineH;
    return { id: p.id, rect, shapes: [...figure(p, cx, top, c, ext), ...texts(p, cx, nameY, c)] };
  }
  const box = body(p, rect, c, ext ? 'headExternal' : 'head', ext ? 'strokeExternal' : 'stroke');
  const lift = p.kind === 'database' ? s.symbolR / 4 : 0;
  const nameY = top + size.h / 2 + nameDy + lift + (p.stereotype ? s.stereoH / 2 : 0);
  return { id: p.id, rect, shapes: [...box, ...texts(p, cx, nameY, c)] };
}
