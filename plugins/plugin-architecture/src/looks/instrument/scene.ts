import { type Drawing, domId, type Shape } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import { MARGIN } from '@diagrist/parts';
import type { PlacedFrame } from '../../layout/index.js';
import type { ArchitectureModel } from '../../model/types.js';
import { edgeShapes } from '../../scene/edges.js';
import { noteShapes } from '../../scene/extras.js';
import { architectureAnchors } from '../../scene/index.js';
import type { Texts } from '../../texts/index.js';
import { BAR_H, type InstrumentLayout, layoutInstrument } from './layout.js';
import { instrumentNodes } from './nodes.js';
import { placedOf } from './placed.js';
import { instrumentStyles } from './styles.js';
import { calloutShapes, routeTagShapes, sheetShapes, tagShapes } from './tag-shapes.js';

/** Baselines of kind, title and subtitle at the top of the sheet. */
const HEAD = { kind: 28, title: 48, subtitle: 64 } as const;
/** The anchor dot in a frame's bar, where its title starts, and the baseline of the team below the bar. */
const BAR = { dot: 10, r: 3, text: 20, baseline: 12.5, team: 14 } as const;

/** The kind as a micro label, the title in tracked capitals, the subtitle in mono capitals. */
function header(kind: string, title: string, subtitle: string | undefined): Shape[] {
  return [
    ...(kind
      ? [{ kind: 'text', x: MARGIN, y: HEAD.kind, text: kind.toUpperCase(), role: 'kicker', font: 'tech' } as const]
      : []),
    { kind: 'text', x: MARGIN, y: HEAD.title, text: title.toUpperCase(), role: 'title', font: 'title' },
    ...(subtitle
      ? [
          {
            kind: 'text',
            x: MARGIN,
            y: HEAD.subtitle,
            text: subtitle.toUpperCase(),
            role: 'subtitle',
            font: 'badge',
          } as const,
        ]
      : []),
  ];
}

/** A frame: a fine outline, a grey bar with an orange anchor dot and the title, team or role below the bar. */
function frameShapes(f: PlacedFrame, texts: Texts): Shape {
  const { group: g, rect } = f;
  const team = (g.team ?? (g.role ? texts.roles[g.role] : '')).toUpperCase();
  const children: Shape[] = [
    { kind: 'rect', ...rect, role: 'frame' },
    { kind: 'rect', ...rect, h: BAR_H, role: 'frameBar' },
    { kind: 'circle', cx: rect.x + BAR.dot, cy: rect.y + BAR_H / 2, r: BAR.r, role: 'anchor' },
    { kind: 'text', x: rect.x + BAR.text, y: rect.y + BAR.baseline, text: g.title, role: 'frameTitle', font: 'group' },
    ...(team
      ? [
          {
            kind: 'text',
            x: rect.x + BAR.text,
            y: rect.y + BAR_H + BAR.team,
            text: team,
            role: 'frameTeam',
            font: 'tech',
          } as const,
        ]
      : []),
  ];
  return { kind: 'group', id: domId.group(g.id), children };
}

/** Each layer in its group `layer-<row>`: the rail to the picture, the leader, the name as a grey tag. */
function layerShapes(layout: InstrumentLayout): Shape[] {
  return layout.layers.map(({ leader: l, ...tag }) => ({
    kind: 'group',
    id: `layer-${l.row}`,
    children: [
      ...(l.spine ? [{ kind: 'line', ...l.spine, role: 'rail' } as const] : []),
      ...(l.attachment ? [{ kind: 'line', ...l.attachment, role: 'rail' } as const] : []),
      { kind: 'line', ...l.leader, x2: tag.rect.x, role: 'rail' },
      ...tagShapes(tag),
    ],
  }));
}

/**
 * A C4 diagram in `look=instrument`: header, layers, frames, boxes, notes, edges, the tags of edges, callouts at
 * boxes, and the decision column and legend; with its style table, anchors and what the placement check sees.
 */
export function instrumentDrawing(model: ArchitectureModel, texts: Texts, locale: Locale): Drawing {
  const layout = layoutInstrument(model, texts, locale);
  const { base, sheet } = layout;
  const m = base.sizing.m;
  const children: Shape[] = [
    ...header(model.label ?? texts.kinds[model.level], model.title, model.subtitle),
    ...layerShapes(layout),
    ...base.frames.map((f) => frameShapes(f, texts)),
    ...instrumentNodes(base.nodes, model.level, m, texts, layout.words),
    ...noteShapes(base.notes),
    ...edgeShapes(layout.model, base.routes, [], m.markerSize),
    ...routeTagShapes(layout),
    ...layout.callouts.flatMap(calloutShapes),
    ...sheetShapes(sheet),
  ];
  return {
    scene: { width: sheet.width, height: sheet.height, title: model.title, children },
    styles: instrumentStyles(m),
    anchors: { ...architectureAnchors(layout.model, base), width: sheet.width, height: sheet.height },
    placed: placedOf(layout),
  };
}
