import { domId, type Shape, textWidth } from '@diagrist/core';
import { MARGIN } from '@diagrist/parts';
import type { PlacedFrame } from '../../layout/index.js';
import type { LayerArt } from '../../layout/layers.js';
import type { Metrics } from '../../layout/metrics.js';
import type { Texts } from '../../texts/index.js';

/** Baselines of kind, title and subtitle at the top of the sheet. */
const HEAD = { kicker: 30, title: 52, subtitle: 70 } as const;
const DOTS = { step: 16, first: 8 } as const;
const PANEL_RX = 16;
const TITLE_DOT = { r: 4, gap: 10, rise: 4 } as const;
const LAYER = { h: 22, pad: 10, dy: 4 } as const;
const TAG_RX = 8;

const given = (text: string | undefined, shape: (text: string) => Shape): Shape[] => (text ? [shape(text)] : []);

/** The ground: a dot every 16 pixels, drawn as dashes of length zero with round caps, one path for all rows. */
export function dotGrid(width: number, height: number): Shape {
  const rows = Array.from(
    { length: Math.ceil((height - DOTS.first) / DOTS.step) },
    (_, i) => DOTS.first + i * DOTS.step,
  );
  return { kind: 'path', d: rows.map((y) => `M${DOTS.first} ${y} H${width}`).join(' '), role: 'dotGrid' };
}

/** The kind in the focus colour above the title, then title and subtitle; `label=""` leaves the kind out. */
export const panelHeader = (kind: string, title: string, subtitle: string | undefined): Shape[] => [
  ...given(kind, (t) => ({ kind: 'text', x: MARGIN, y: HEAD.kicker, text: t, role: 'kicker', font: 'group' })),
  { kind: 'text', x: MARGIN, y: HEAD.title, text: title, role: 'title', font: 'title' },
  ...given(subtitle, (t) => ({ kind: 'text', x: MARGIN, y: HEAD.subtitle, text: t, role: 'subtitle', font: 'note' })),
];

/** How deep a frame lies inside others; panels inside panels alternate their tone. */
function depthOf(f: PlacedFrame, frames: readonly PlacedFrame[]): number {
  const parent = frames.find((p) => p.group.id === f.group.parent);
  return parent ? 1 + depthOf(parent, frames) : 0;
}

/**
 * A panel: a tinted area without border that says who the cards on it belong to, its title centred on top with
 * the party's dot before it, the team below; a title on the side stays there.
 */
function panelShapes(f: PlacedFrame, frames: readonly PlacedFrame[], texts: Texts, m: Metrics): Shape[] {
  const { group: g, head, rect } = f;
  const team = g.team ?? (g.role ? texts.roles[g.role] : '');
  const side = g.heading === 'side';
  const cx = rect.x + rect.w / 2;
  const title = side ? head.title : { x: cx, y: rect.y + m.groupTitleY };
  const anchor = side ? ('start' as const) : ('middle' as const);
  const dotX = side ? title.x - TITLE_DOT.gap : cx - textWidth(g.title, m.fonts.group) / 2 - TITLE_DOT.gap;
  const tag = head.tag;
  return [
    { kind: 'rect', ...rect, rx: PANEL_RX, role: depthOf(f, frames) % 2 === 1 ? 'panelInner' : 'panel' },
    ...(g.title && g.role
      ? [{ kind: 'circle', cx: dotX, cy: title.y - TITLE_DOT.rise, r: TITLE_DOT.r, role: `party-${g.role}` } as const]
      : []),
    ...given(g.title, (t) => ({ kind: 'text', ...title, text: t, role: 'panelTitle', font: 'group', anchor })),
    ...given(side ? '' : team, (t) => ({
      kind: 'text',
      x: cx,
      y: rect.y + m.groupSubtitleY,
      text: t,
      role: 'panelTeam',
      font: 'note',
      anchor: 'middle',
    })),
    ...(tag && g.tag
      ? [
          { kind: 'rect', ...tag.rect, rx: TAG_RX, role: 'pill' } as const,
          { kind: 'text', ...tag.text, text: g.tag, role: 'name', font: 'name', anchor: 'middle' } as const,
        ]
      : []),
  ];
}

/** Every frame as a panel in its group `group-<id>`, parents first. */
export const panelFrames = (frames: readonly PlacedFrame[], texts: Texts, m: Metrics): Shape[] =>
  frames.map(
    (f): Shape => ({ kind: 'group', id: domId.group(f.group.id), children: panelShapes(f, frames, texts, m) }),
  );

/** Each layer as a small white pill right of the picture, on the middle of its row. */
export const panelLayers = (layers: readonly LayerArt[], m: Metrics): Shape[] =>
  layers.map((l): Shape => {
    const w = textWidth(l.label, m.fonts.group) + 2 * LAYER.pad;
    const y = l.leader.y1;
    return {
      kind: 'group',
      id: `layer-${l.row}`,
      children: [
        { kind: 'rect', x: l.rect.x, y: y - LAYER.h / 2, w, h: LAYER.h, rx: LAYER.h / 2, role: 'layerPill' },
        {
          kind: 'text',
          x: l.rect.x + w / 2,
          y: y + LAYER.dy,
          text: l.label,
          role: 'layerText',
          font: 'group',
          anchor: 'middle',
        },
      ],
    };
  });
