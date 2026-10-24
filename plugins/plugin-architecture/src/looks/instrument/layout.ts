import type { Point, Rect } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import { WORDS } from '@diagrist/parts';
import type { EdgeKind } from '../../grammar/edges.js';
import { linesHit } from '../../layout/geometry.js';
import { type ArchitectureLayout, layoutArchitecture } from '../../layout/index.js';
import type { LayerArt } from '../../layout/layers.js';
import type { ArchitectureModel } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import { type Callout, type Obstacles, seatCallout } from './callouts.js';
import { inCapitals } from './capitals.js';
import { INSTRUMENT_SHEET_FONTS } from './metrics.js';
import { type InstrumentSheet, instrumentSheet, type LegendTag } from './sheet.js';
import { slideTags } from './slide.js';
import { edgeTags, narrowed, stepTags, type Tag, tagAt } from './tags.js';
import { INSTRUMENT_WORDS, type InstrumentWords } from './words.js';

/** The C4 layout in capitals with what `look=instrument` adds: tags on edges, callouts at boxes, its sheet. */
export interface InstrumentLayout {
  /** The model in capitals, as measured and drawn. */
  readonly model: ArchitectureModel;
  readonly base: ArchitectureLayout;
  /** The texts of each edge as one tag on its line. */
  readonly labels: readonly Tag[];
  /** Flow numbers and marks at edges. */
  readonly tags: readonly Tag[];
  readonly callouts: readonly Callout[];
  /** The layers as grey tags where the leaders of the shared layout end. */
  readonly layers: readonly (Tag & { readonly leader: LayerArt })[];
  readonly sheet: InstrumentSheet;
  readonly words: InstrumentWords;
}

const EDGE_ORDER: readonly EdgeKind[] = ['sync', 'async', 'dependency', 'data', 'link', 'duplex'];
/** Height of a frame's title bar, which callouts keep clear of. */
export const BAR_H = 18;
/** How far below its leader the baseline of a layer's name sits, so the capitals centre on the leader. */
const LAYER_DY = 3.5;

const right = (r: Rect): number => r.x + r.w;
const bottom = (r: Rect): number => r.y + r.h;
const outline = (r: Rect): Point[] => [
  [r.x, r.y],
  [right(r), r.y],
  [right(r), bottom(r)],
  [r.x, bottom(r)],
  [r.x, r.y],
];

/** Callouts at boxes: decisions first in orange, then the core in black; each keeps clear of all seated before. */
function callouts(model: ArchitectureModel, base: ArchitectureLayout, tags: readonly Tag[], words: InstrumentWords) {
  const m = base.sizing.m;
  const out: Callout[] = [];
  const obstacles = (): Obstacles => ({
    lines: [...base.routes.map((r) => r.points), ...base.frames.map((f) => outline(f.rect))],
    rects: [
      ...base.nodes.map((n) => n.rect),
      ...base.frames.map((f) => ({ ...f.rect, h: BAR_H })),
      ...tags.map((t) => t.rect),
      ...out.flatMap((c) => [c.tag.rect]),
    ],
  });
  const wanted = [
    ...model.nodes.flatMap((n) => (n.mark ? [{ id: n.id, text: n.mark, core: false }] : [])),
    ...model.nodes.flatMap((n) => (n.emph ? [{ id: n.id, text: words.core, core: true }] : [])),
  ];
  for (const w of wanted) {
    const rect = base.nodes.find((n) => n.node.id === w.id)?.rect;
    if (!rect) continue;
    const font = w.core
      ? { font: m.fonts.label, role: 'label' as const }
      : { font: m.fonts.badge, role: 'badge' as const };
    out.push(seatCallout(w.id, rect, w.text, font, w.core ? 'core' : 'signal', obstacles()));
  }
  return out;
}

/** The tags of the legend: core, the flows in the tone of their edges, decisions; only what the picture shows. */
function legendTags(model: ArchitectureModel, words: InstrumentWords): LegendTag[] {
  const two = (n: number) => String(n).padStart(2, '0');
  return [
    ...(model.nodes.some((n) => n.emph) ? [{ text: words.core, tone: 'core' as const }] : []),
    ...model.flows.map((f) => ({
      text: `${f.id.toUpperCase()} ${f.from === f.to ? two(f.from) : `${two(f.from)}–${two(f.to)}`}`,
      tone: f.accent ? ('core' as const) : ('plain' as const),
    })),
    ...(model.decisions.length > 0 || model.nodes.some((n) => n.mark) || model.edges.some((e) => e.mark)
      ? [{ text: words.decision, tone: 'signal' as const }]
      : []),
  ];
}

/**
 * Lays out a C4 diagram in `look=instrument`: the shared layout of the model in capitals, then the texts of edges
 * and the flow numbers as tags, marks at edges as orange tags, callouts at boxes, the decision column and the legend.
 */
export function layoutInstrument(model: ArchitectureModel, texts: Texts, locale: Locale): InstrumentLayout {
  const words = INSTRUMENT_WORDS[locale];
  const capitals = inCapitals(model, texts, words);
  const base = layoutArchitecture(capitals, texts, locale);
  const m = base.sizing.m;
  const marks = base.marks.flatMap((k) =>
    k.route === undefined
      ? []
      : [{ ...tagAt(k.id, { ...k, anchor: 'middle' }, m.fonts.badge, 'badge', 'signal'), route: k.route }],
  );
  const ground = {
    boxes: base.nodes.map((n) => n.rect),
    frames: base.frames.map((f) => f.rect),
    bars: base.frames.map((f) => ({ ...f.rect, h: BAR_H })),
  };
  const labels = slideTags(edgeTags(capitals, base.labels, base.routes, m), base.routes, ground, (t) => narrowed(t, m));
  const taken = (r: Rect) =>
    [...ground.boxes, ...ground.bars, ...labels.map((l) => l.rect)].some(
      (o) => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y,
    ) || base.routes.some((route) => linesHit([route.points], r, 0));
  const tags = [...stepTags(base.badges, labels, taken, m), ...marks];
  const layers = base.layers.map((l) => ({
    ...tagAt(l.label, { x: l.rect.x, y: l.leader.y1 + LAYER_DY }, m.fonts.group, 'group', 'plain'),
    leader: l,
  }));
  const seated = callouts(capitals, base, [...labels, ...tags], words);
  const drawn = [
    ...base.nodes.map((n) => n.rect),
    ...base.frames.map((f) => f.rect),
    ...labels.map((t) => t.rect),
    ...tags.map((t) => t.rect),
  ];
  const all = [
    ...drawn,
    ...seated.map((c) => c.tag.rect),
    ...layers.map((l) => l.rect),
    ...base.notes.map((n) => n.rect),
  ];
  const rightmost = Math.max(m.marginX, ...all.map(right), ...base.routes.flatMap((r) => r.points.map((p) => p[0])));
  const kinds = new Set(base.routes.map((r) => model.edges[Number(r.edge)]?.kind));
  const sheet = instrumentSheet(
    {
      decisions: model.decisions,
      tags: legendTags(model, words),
      lines: EDGE_ORDER.filter((k) => kinds.has(k)).map((kind) => ({ kind, text: texts.edges[kind] })),
      top: drawn.length > 0 ? Math.min(...drawn.map((r) => r.y)) : m.firstRowY,
      right: rightmost,
      bottom: Math.max(m.firstRowY, ...all.map(bottom)),
      width: rightmost + m.marginX,
      open: WORDS[locale].open,
      choice: INSTRUMENT_SHEET_FONTS.choice,
    },
    m,
  );
  return { model: capitals, base, labels, tags, layers, callouts: seated, sheet, words };
}
