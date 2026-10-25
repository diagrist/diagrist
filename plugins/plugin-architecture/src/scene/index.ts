import { type Anchors, domId, type Scene, type Shape } from '@diagrist/core';
import { legendShapes, sheetShapes, stripShapes, type Words } from '@diagrist/parts';
import type { ArchitectureLayout } from '../layout/index.js';
import type { ArchitectureModel } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { edgeShapes } from './edges.js';
import { frameShapes } from './groups/index.js';
import { HEADERS } from './header.js';
import { labelledRoutes, labelShapes } from './labels/index.js';
import { layerShapes } from './layers.js';
import { sampleShapes } from './legend.js';
import { nodeShapes } from './nodes/index.js';
import { noteShapes } from './notes.js';
import { surfacesOf } from './surfaces.js';

/**
 * The picture in drawing order: header, layers, frames, elements, notes, edges, labels with flow numbers and
 * marks, decision bar, legend, margin notes. Each piece is drawn as the options of the layout's look say; shapes
 * carry roles, and the style table of the look paints them.
 */
export function architectureScene(
  model: ArchitectureModel,
  layout: ArchitectureLayout,
  texts: Texts,
  words: Words,
): Scene {
  const { look } = layout;
  const under = surfacesOf(layout.frames, look.options.groups.form);
  const children: Shape[] = [
    ...HEADERS[look.options.header](model, texts, look),
    ...layerShapes(layout.layers, look),
    ...frameShapes(layout.frames, look, texts),
    ...nodeShapes(model, layout, texts),
    ...noteShapes(layout.notes),
    ...edgeShapes(model, layout.routes, under, look.metrics.markerSize),
    ...labelShapes(model, layout.routes, layout, under),
    ...stripShapes(layout.strip, words),
    ...(layout.legend ? legendShapes(layout.legend, sampleShapes) : []),
    ...(layout.sheet ? sheetShapes(layout.sheet) : []),
  ];
  return { width: layout.width, height: layout.height, title: model.title, children };
}

/** Where nodes, frames and edges are, by the DOM ids of their groups, for embeddings such as animations. */
export function architectureAnchors(model: ArchitectureModel, layout: ArchitectureLayout): Anchors {
  const labelled = new Set(labelledRoutes(layout));
  return {
    width: layout.width,
    height: layout.height,
    nodes: layout.nodes.map((p) => ({ id: p.node.id, domId: domId.node(p.node.id), rect: p.rect })),
    groups: layout.frames.map((f) => ({ id: f.group.id, domId: domId.group(f.group.id), rect: f.rect })),
    edges: layout.routes.map((r, index) => {
      const e = model.edges[Number(r.edge)];
      return {
        index,
        from: e?.from ?? '',
        to: e?.to ?? '',
        domId: domId.edge(index),
        ...(labelled.has(index) ? { labelId: domId.label(index) } : {}),
        points: r.points,
      };
    }),
  };
}
