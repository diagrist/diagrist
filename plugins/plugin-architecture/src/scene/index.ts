import { type Anchors, domId, type Scene, type Shape } from '@diagrist/core';
import { HEADER, headerShapes, imageTitle, legendShapes, stripShapes, type Words } from '@diagrist/parts';
import type { ArchitectureLayout } from '../layout/index.js';
import { columnsScene } from '../looks/columns/scene.js';
import type { ArchitectureModel } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { edgeShapes } from './edges.js';
import { layerShapes, noteShapes } from './extras.js';
import { frameShapes } from './frames.js';
import { labelledRoutes, labelShapes } from './labels.js';
import { sampleShapes } from './legend.js';
import { nodeShapes } from './nodes.js';
import { paperHeader, paperLayerShapes, sheetShapes } from './paper.js';
import { surfacesOf } from './surfaces.js';

/** The title line: `label=` replaces the name of the kind, an empty one leaves the title alone. */
function titleOf(model: ArchitectureModel, texts: Texts): string {
  const kind = model.label ?? texts.kinds[model.level];
  return kind ? imageTitle(kind, model.title) : model.title;
}

/**
 * The picture in drawing order: title, layers, frames, elements, notes, edges, labels with flow numbers and
 * marks, decision bar, legend. Shapes carry roles; the style table of the look paints them.
 */
export function architectureScene(
  model: ArchitectureModel,
  layout: ArchitectureLayout,
  texts: Texts,
  words: Words,
): Scene {
  if (model.look === 'columns') return columnsScene(model, layout, texts);
  const under = surfacesOf(layout.frames, model.look);
  const header =
    model.look === 'paper'
      ? paperHeader(model.label ?? texts.kinds[model.level], model.title, model.subtitle)
      : headerShapes(HEADER, titleOf(model, texts), model.subtitle);
  const children: Shape[] = [
    ...header,
    ...(model.look === 'paper' ? paperLayerShapes(layout.layers) : layerShapes(layout.layers)),
    ...frameShapes(layout.frames, model.look, texts),
    ...nodeShapes(model, layout, texts),
    ...noteShapes(layout.notes),
    ...edgeShapes(model, layout.routes, under, layout.sizing.m.markerSize),
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
