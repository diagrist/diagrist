import type { Scene, Shape } from '@diagrist/core';
import { markShapes } from '@diagrist/parts';
import type { ArchitectureLayout } from '../../layout/index.js';
import type { ArchitectureModel } from '../../model/types.js';
import { bodyShapes, replicaShapes } from '../../scene/bodies.js';
import { noteShapes } from '../../scene/extras.js';
import type { Surface } from '../../scene/surfaces.js';
import type { Texts } from '../../texts/index.js';
import { panelNodeShapes } from './cards.js';
import { dotGrid, panelFrames, panelHeader, panelLayers } from './ground.js';
import type { PanelSample } from './legend.js';
import { panelBadge, panelEdgeShapes, panelLabelShapes } from './lines.js';
import type { PanelShelf } from './shelf.js';

const SAMPLE = { line: 28, dot: 5, h: 16, rx: 4 } as const;

/** The sample of a legend row, its left end at (x, y) on the row's middle. */
function sampleShapes(sample: PanelSample, x: number, y: number): readonly Shape[] {
  const box = { x, y: y - SAMPLE.h / 2, w: SAMPLE.line, h: SAMPLE.h };
  switch (sample.kind) {
    case 'edge':
      return [{ kind: 'path', d: `M${x} ${y} H${x + SAMPLE.line}`, role: `edge-${sample.edge}` }];
    case 'party':
      return [{ kind: 'circle', cx: x + SAMPLE.dot + 1, cy: y, r: SAMPLE.dot, role: `party-${sample.party}` }];
    case 'badge':
      return panelBadge(sample.n, x + 8, y, sample.accent);
    case 'focus':
      return [{ kind: 'rect', ...box, rx: SAMPLE.rx, role: 'focusSample' }];
    case 'status':
      return [
        {
          kind: 'circle',
          cx: x + SAMPLE.dot + 1,
          cy: y,
          r: SAMPLE.dot - 1,
          role: `status${sample.status === 'planned' ? 'Planned' : 'Deprecated'}`,
        },
      ];
    case 'replicas':
      return replicaShapes('x3', { x: x + 12, y });
    case 'shape':
      return bodyShapes(sample.shape, box, 'boxFlat', 'detail', SAMPLE.rx);
    case 'mark':
      return markShapes('E1', x + 12, y);
    case 'icon':
      return [];
  }
}

/** The legend card and the decision cards below the picture. */
const shelfShapes = (shelf: PanelShelf): Shape[] =>
  shelf.cards.map(
    (card): Shape => ({
      kind: 'group',
      children: [
        { kind: 'rect', ...card.rect, rx: 8, role: card.role },
        ...(card.mark ? markShapes(card.mark.id, card.mark.x, card.mark.y) : []),
        ...card.samples.flatMap((s) => sampleShapes(s.sample, s.x, s.y)),
        ...card.texts.map((t): Shape => ({ kind: 'text', x: t.x, y: t.y, text: t.text, role: t.role, font: t.font })),
      ],
    }),
  );

/**
 * The picture of `look=panel` in drawing order: the dotted ground, title, layers, panels, cards, notes, edges, the
 * pills on them with flow numbers and marks, and the shelf of legend and decisions.
 */
export function panelScene(model: ArchitectureModel, layout: ArchitectureLayout, texts: Texts): Scene {
  const m = layout.sizing.m;
  const under: Surface[] = layout.frames.map((f) => ({ rect: f.rect, tone: 'zone' }));
  const children: Shape[] = [
    dotGrid(layout.width, layout.height),
    ...panelHeader(model.label ?? texts.kinds[model.level], model.title, model.subtitle),
    ...panelLayers(layout.layers, m),
    ...panelFrames(layout.frames, texts, m),
    ...panelNodeShapes(model, layout, texts),
    ...noteShapes(layout.notes),
    ...panelEdgeShapes(model, layout, under),
    ...panelLabelShapes(model, layout),
    ...(layout.shelf ? shelfShapes(layout.shelf) : []),
  ];
  return { width: layout.width, height: layout.height, title: model.title, children };
}
