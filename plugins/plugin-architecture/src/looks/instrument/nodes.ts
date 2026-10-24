import { domId, type Rect, type Shape } from '@diagrist/core';
import type { Level } from '../../grammar/elements.js';
import type { PlacedElement } from '../../layout/index.js';
import { secondLineRole } from '../../layout/measure.js';
import type { Metrics } from '../../layout/metrics.js';
import type { ArchNode } from '../../model/types.js';
import { bodyShapes, clockShapes } from '../../scene/bodies.js';
import { iconRole } from '../../scene/icons.js';
import type { Texts } from '../../texts/index.js';
import { microLabel } from './capitals.js';
import type { InstrumentWords } from './words.js';

/** A person is a knob: a ring with a filled core, as wide as the column of people, name and role below. */
const KNOB = { r: 20, core: 8, name: 18, line: 15 } as const;
/** Cap heights of micro label, name and description, and the steps between their baselines. */
const CAP = { micro: 6, name: 9, description: 8 } as const;
const STEP = { name: 17, description: 16 } as const;
/** The number of replicas centres on the corner spot of the shared art, left of a job's clock. */
const REPLICA_DY = 3;
/** How far texts in a cylinder move down, below the front of its lid. */
const DB_SHIFT = 6;

function knobShapes(n: ArchNode, rect: Rect): Shape[] {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const name = cy + KNOB.r + KNOB.name;
  return [
    { kind: 'circle', cx, cy, r: KNOB.r, role: 'knob' },
    { kind: 'circle', cx, cy, r: KNOB.core, role: 'knobCore' },
    { kind: 'text', x: cx, y: name, text: n.label, role: 'name', font: 'name', anchor: 'middle' },
    ...(n.tech
      ? [
          {
            kind: 'text',
            x: cx,
            y: name + KNOB.line,
            text: n.tech,
            role: 'description',
            font: 'description',
            anchor: 'middle',
          } as const,
        ]
      : []),
  ];
}

/** The lines inside a box from the top, each with its role and font role, centred as one block in the box. */
function lines(n: ArchNode, rect: Rect, level: Level, texts: Texts, words: InstrumentWords): Shape[] {
  const tech = secondLineRole(n) === 'tech';
  const micro = tech ? n.tech : microLabel(n, level, texts, words);
  const description = tech ? undefined : n.tech;
  const parts = [
    ...(micro ? [{ text: micro, role: 'micro', font: 'tech', cap: CAP.micro, step: 0 }] : []),
    { text: n.label, role: 'name', font: 'name', cap: CAP.name, step: micro ? STEP.name : 0 },
    ...(description
      ? [{ text: description, role: 'description', font: 'description', cap: CAP.description, step: STEP.description }]
      : []),
  ];
  const [first] = parts;
  const height = (first?.cap ?? 0) + parts.reduce((sum, p) => sum + p.step, 0);
  let y = rect.y + (rect.h - height) / 2 + (first?.cap ?? 0) + (n.shape === 'db' ? DB_SHIFT : 0);
  return parts.map((p, i): Shape => {
    if (i > 0) y += p.step;
    return { kind: 'text', x: rect.x, y, text: p.text, role: p.role, font: p.font };
  });
}

/** A box: its body without corners, the number of replicas in mono, clock, icon, then micro label, name, description. */
function boxShapes(p: PlacedElement, level: Level, m: Metrics, texts: Texts, words: InstrumentWords): Shape[] {
  const { node: n, rect } = p;
  const out: Shape[] = [...bodyShapes(n.shape, rect, n.emph ? 'boxEmph' : 'box', 'detail', 0)];
  if (p.art.kind === 'box' && n.shape === 'job') out.push(...clockShapes(p.art.clock, 'detail'));
  if (n.replicas !== undefined && p.art.kind === 'box')
    out.push({
      kind: 'text',
      x: p.art.replicas.x,
      y: p.art.replicas.y + REPLICA_DY,
      text: `×${n.replicas}`,
      role: 'replicaText',
      font: 'replica',
      anchor: 'middle',
    });
  const x = rect.x + m.nodePad + (n.icon ? m.iconSize + m.iconGap : 0);
  if (n.icon) {
    const y = rect.y + rect.h / 2 - m.iconSize / 2 + (n.shape === 'db' ? DB_SHIFT / 2 : 0);
    out.push({ kind: 'icon', icon: n.icon, x: rect.x + m.nodePad, y, size: m.iconSize, role: iconRole(n.icon, 'ink') });
  }
  return [...out, ...lines(n, rect, level, texts, words).map((s) => (s.kind === 'text' ? { ...s, x } : s))];
}

/** Every element in its group `node-<id>`: people as knobs, everything else as a box. */
export function instrumentNodes(
  nodes: readonly PlacedElement[],
  level: Level,
  m: Metrics,
  texts: Texts,
  words: InstrumentWords,
): Shape[] {
  return nodes.map(
    (p): Shape => ({
      kind: 'group',
      id: domId.node(p.node.id),
      children: p.node.keyword === 'person' ? knobShapes(p.node, p.rect) : boxShapes(p, level, m, texts, words),
    }),
  );
}
