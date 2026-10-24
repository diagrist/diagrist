import type { Shape } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import type { Comment } from '../layout/art.js';
import type { Drawn } from '../layout/labels.js';
import { UC } from '../layout/metrics.js';

const ROLE = {
  association: 'association',
  generalization: 'generalization',
  include: 'dependency',
  extend: 'dependency',
};

const pathOf = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

/**
 * A relation in its group `edge-<k>`: first a halo in the colour of the canvas that cuts lines crossing below it,
 * then the line with its head at the target.
 */
export function edgeShape(d: Drawn, points: readonly (readonly [number, number])[], id: string): Shape {
  const role = `${ROLE[d.relation.kind]}${d.relation.emph ? '-emph' : ''}`;
  const path = pathOf(points);
  return {
    kind: 'group',
    id,
    children: [
      { kind: 'path', d: path, role: 'halo' },
      { kind: 'path', d: path, role },
    ],
  };
}

/** The labels of one route in their group `label-<k>`: stereotype and name, multiplicities, an extend note's lines. */
export function labelShape(labels: readonly EdgeLabel[], emph: boolean, id: string): Shape {
  const role = emph ? 'labelEmph' : 'label';
  return {
    kind: 'group',
    id,
    children: labels.map((l) => ({
      kind: 'text',
      x: l.x,
      y: l.y,
      text: l.text,
      role,
      font: 'label',
      anchor: l.anchor,
    })),
  };
}

/**
 * A comment as in UML 2.5.1, figure 18.3: a box with a folded corner, joined by a dashed line. The lines of a note on
 * an element stand in the comment; those of an extend note are labels of its line.
 */
export function commentShape(c: Comment, cards: boolean): Shape {
  const { x, y, w, h } = c.rect;
  const fold = UC.noteFold;
  const corner = x + w - fold;
  const role = cards ? 'noteCard' : 'note';
  const [a, b] = c.link;
  return {
    kind: 'group',
    children: [
      { kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], role: 'noteTail' },
      { kind: 'path', d: `M${x} ${y} L${corner} ${y} L${x + w} ${y + fold} L${x + w} ${y + h} L${x} ${y + h} Z`, role },
      { kind: 'path', d: `M${corner} ${y} L${corner} ${y + fold} L${x + w} ${y + fold}`, role },
      ...(c.route === undefined
        ? c.lines.map(
            (t): Shape => ({
              kind: 'text',
              x: t.x,
              y: t.y,
              text: t.text,
              role: 'noteText',
              font: 'label',
              anchor: 'start',
            }),
          )
        : []),
    ],
  };
}
