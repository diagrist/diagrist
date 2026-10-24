import { domId, type Shape } from '@diagrist/core';
import type { Callout } from './callouts.js';
import type { InstrumentLayout } from './layout.js';
import type { InstrumentSheet } from './sheet.js';
import type { Tag } from './tags.js';

/** Radius of the dot where a decision's leader meets its box. */
const DOT_R = 4;

/** A tag: its rectangle in the tone's fill, its text in the colour and face that go with the fill. */
export const tagShapes = (t: Tag): Shape[] => [
  { kind: 'rect', ...t.rect, role: `tag-${t.tone}` },
  ...t.lines.map(
    (l): Shape => ({ kind: 'text', x: l.x, y: l.y, text: l.text, role: `tag-${t.tone}-${l.font}`, font: l.font }),
  ),
];

/** A callout: the leader, a dot on the border for a decision, then the tag. */
export function calloutShapes(c: Callout): Shape[] {
  const signal = c.tag.tone === 'signal';
  return [
    { kind: 'line', ...c.leader, role: signal ? 'leader-signal' : 'leader-core' },
    ...(signal ? [{ kind: 'circle', cx: c.leader.x2, cy: c.leader.y2, r: DOT_R, role: 'leader-dot' } as const] : []),
    ...tagShapes(c.tag),
  ];
}

/** Per route with texts, numbers or marks a group `label-<i>` with their tags, in route order. */
export function routeTagShapes(layout: InstrumentLayout): Shape[] {
  const all = [...layout.labels, ...layout.tags];
  const routes = [...new Set(all.flatMap((t) => (t.route === undefined ? [] : [t.route])))].sort((a, b) => a - b);
  return routes.map(
    (i): Shape => ({
      kind: 'group',
      id: domId.label(i),
      children: all.filter((t) => t.route === i).flatMap(tagShapes),
    }),
  );
}

/** The decision column and the legend: tags, prose, and the line patterns with their meaning. */
export const sheetShapes = (sheet: InstrumentSheet): Shape[] => [
  ...sheet.tags.flatMap(tagShapes),
  ...sheet.samples.map((s): Shape => ({ kind: 'path', d: `M${s.x1} ${s.y} H${s.x2}`, role: `edge-${s.kind}` })),
  ...sheet.texts.map((t): Shape => ({ kind: 'text', x: t.x, y: t.y, text: t.text, role: t.role, font: t.font })),
];
