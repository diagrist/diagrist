import { textWidth } from '@diagrist/core';
import { wrapTwo } from '@diagrist/layout-grid';
import type { Actor } from '../diagram.js';
import type { ActorArt, StickFigure } from './art.js';
import { UC_FONTS as F, snap, UC } from './metrics.js';

export const ACTOR_KEYWORD = '«actor»';

/** Long roles wrap, so the column of actors stays narrow. */
const lines = (a: Actor): string[] => (a.label.length > UC.wrap ? wrapTwo(a.label) : [a.label]);

const nameWidth = (a: Actor): number => Math.max(...lines(a).map((l) => textWidth(l, F.ucName)));

/**
 * What an actor asks of the grid. A system actor is a box with stereotype and name. A person is the stick figure,
 * its role hangs below as a caption; its column is as wide as the wider of both.
 */
export function actorSize(a: Actor): {
  readonly w: number;
  readonly h: number;
  readonly column: number;
  readonly caption?: { readonly w: number; readonly below: number };
} {
  if (a.system) {
    const w = snap(Math.max(textWidth(ACTOR_KEYWORD, F.stereo), nameWidth(a)) + 2 * UC.actorBoxPad);
    const h = snap(UC.stereoH + lines(a).length * UC.lineH + 2 * UC.actorBoxPad);
    return { w, h, column: w };
  }
  const caption = { w: nameWidth(a), below: lines(a).length * UC.lineH + 4 };
  return { w: UC.actorW, h: UC.actorH, column: snap(Math.max(UC.actorW, caption.w)), caption };
}

function figure(x: number, y: number): StickFigure {
  const r = UC.actorH * 0.155;
  const neck = y + 2 * r;
  const hip = y + UC.actorH * 0.69;
  const half = UC.actorW / 2;
  return {
    head: { cx: x, cy: y + r, r },
    body: { x1: x, y1: neck, x2: x, y2: hip },
    arms: { x1: x - half * 0.75, y1: neck + r * 0.9, x2: x + half * 0.75, y2: neck + r * 0.9 },
    legs: [
      { x1: x, y1: hip, x2: x - half * 0.6, y2: y + UC.actorH },
      { x1: x, y1: hip, x2: x + half * 0.6, y2: y + UC.actorH },
    ],
  };
}

/** The actor drawn into `rect`: the figure from its top with the role below, or the box with its texts. */
export function actorArt(a: Actor, rect: { x: number; y: number; w: number; h: number }): ActorArt {
  const x = rect.x + rect.w / 2;
  const texts = lines(a);
  if (a.system) {
    const top = rect.y + UC.actorBoxPad;
    return {
      kind: 'actor',
      box: rect,
      stereotype: { text: ACTOR_KEYWORD, x, y: top + F.stereo.size },
      name: texts.map((text, i) => ({ text, x, y: top + UC.stereoH + (i + 1) * UC.lineH - 3 })),
    };
  }
  const labelTop = rect.y + UC.actorH + 4;
  return {
    kind: 'actor',
    figure: figure(x, rect.y),
    name: texts.map((text, i) => ({ text, x, y: labelTop + i * UC.lineH + F.ucName.size })),
  };
}
