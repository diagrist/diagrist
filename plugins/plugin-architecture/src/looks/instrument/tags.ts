import { type Font, type Rect, textWidth } from '@diagrist/core';
import { type EdgeLabel, wrapTwo } from '@diagrist/layout-grid';
import type { Badge } from '../../layout/marks.js';
import type { Metrics } from '../../layout/metrics.js';
import type { ArchitectureModel } from '../../model/types.js';

/** The fill of a tag, which is what it means: black the core, grey the rest, orange a decision. */
export type TagTone = 'core' | 'plain' | 'signal';

/** A line of text in a tag, at its baseline, with the font role it was measured with. */
export interface TagLine {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly font: 'label' | 'badge' | 'group';
}

/** A filled tag: its rectangle, its lines and its tone; `route` names the edge it belongs to, for `label-<i>`. */
export interface Tag {
  readonly rect: Rect;
  readonly lines: readonly TagLine[];
  readonly tone: TagTone;
  readonly route?: number;
}

/** Room around the text of a tag; capitals are about 0.7 of the font size high and sit on the baseline. */
const PAD = { x: 4, y: 4 } as const;
const CAP = 0.7;
/** A step number is a black box as wide as two mono digits and its pads. */
const STEP = { w: 16, h: 13 } as const;

const cap = (font: Font): number => Math.round(font.size * CAP);

/** A tag around one line of text set at (x, y) with `anchor`, measured in `font`. */
export function tagAt(
  text: string,
  at: { readonly x: number; readonly y: number; readonly anchor?: 'start' | 'middle' | 'end' },
  font: Font,
  role: TagLine['font'],
  tone: TagTone,
): Tag {
  const w = textWidth(text, font) + 2 * PAD.x;
  const h = cap(font) + 2 * PAD.y;
  const left = at.anchor === 'middle' ? at.x - w / 2 : at.anchor === 'end' ? at.x - w : at.x;
  return {
    rect: { x: left, y: at.y - h + PAD.y, w, h },
    lines: [{ x: left + PAD.x, y: at.y, text, font: role }],
    tone,
  };
}

const fontOf = (role: TagLine['font'], m: Metrics): Font => m.fonts[role === 'badge' ? 'badge' : role];

/** A tag around lines already set: the union of their measured extents and the pads. */
function around(lines: readonly TagLine[], tone: TagTone, route: number, m: Metrics): Tag {
  const sized = lines.map((l) => ({ ...l, w: textWidth(l.text, fontOf(l.font, m)), cap: cap(fontOf(l.font, m)) }));
  const left = Math.min(...sized.map((l) => l.x)) - PAD.x;
  const top = Math.min(...sized.map((l) => l.y - l.cap)) - PAD.y;
  const w = Math.max(...sized.map((l) => l.x + l.w)) + PAD.x - left;
  const h = Math.max(...sized.map((l) => l.y)) + PAD.y - top;
  return { rect: { x: left, y: top, w, h }, lines, tone, route };
}

/**
 * The texts of each edge as one tag standing on its line, as the layout centred them there: the name in Space
 * Grotesk, protocol and the other details in mono below it. Edges of a flow drawn as the focus (`accent`) get a
 * black tag, all others a grey one.
 */
export function edgeTags(
  model: ArchitectureModel,
  labels: readonly EdgeLabel[],
  routes: readonly { readonly edge: string }[],
  m: Metrics,
): Tag[] {
  const routeIds = [...new Set(labels.map((l) => l.route))];
  return routeIds.map((route) => {
    const tone: TagTone = model.edges[Number(routes[route]?.edge)]?.step?.accent ? 'core' : 'plain';
    const lines = labels
      .filter((l) => l.route === route)
      .map((l): TagLine => {
        const font = l.part === 'detail' ? 'badge' : 'label';
        const w = textWidth(l.text, fontOf(font, m));
        const x = l.anchor === 'middle' ? l.x - w / 2 : l.anchor === 'end' ? l.x - w : l.x;
        return { x, y: l.y, text: l.text, font };
      });
    return around(lines, tone, route, m);
  });
}

/**
 * The tag with its name on two lines, centred where it stood, or nothing when the name is one word or already
 * wraps; for a tag that finds no room on its segment.
 */
export function narrowed(t: Tag, m: Metrics): Tag | undefined {
  const names = t.lines.filter((l) => l.font === 'label');
  const [name] = names;
  const split = names.length === 1 && name ? wrapTwo(name.text) : [];
  if (split.length < 2) return undefined;
  const texts: [string, TagLine['font']][] = [
    ...split.map((s): [string, TagLine['font']] => [s, 'label']),
    ...t.lines.filter((l) => l.font !== 'label').map((l): [string, TagLine['font']] => [l.text, l.font]),
  ];
  const cx = t.rect.x + t.rect.w / 2;
  const first = t.rect.y + t.rect.h / 2 - ((texts.length - 1) * m.labelLineH) / 2 + cap(m.fonts.label) / 2;
  const lines = texts.map(([text, font], i): TagLine => {
    const w = textWidth(text, fontOf(font, m));
    return { x: cx - w / 2, y: first + i * m.labelLineH, text, font };
  });
  return around(lines, t.tone, t.route ?? 0, m);
}

/**
 * Flow numbers as black mono boxes `01`, `02`: on an edge with texts a tab on the top left corner of its tag, or on
 * the bottom left where the top meets something (`taken`); on an edge without texts on the line itself.
 */
export function stepTags(
  badges: readonly Badge[],
  labels: readonly Tag[],
  taken: (r: Rect) => boolean,
  m: Metrics,
): Tag[] {
  return badges.map((b) => {
    const text = String(b.n).padStart(2, '0');
    const tag = labels.find((l) => l.route === b.route)?.rect;
    const tabs = tag
      ? [
          { x: tag.x, y: tag.y - STEP.h },
          { x: tag.x, y: tag.y + tag.h },
        ]
      : [];
    const spot = tabs.find((t) => !taken({ ...t, ...STEP })) ?? tabs[0] ?? { x: b.x - STEP.w / 2, y: b.y - STEP.h / 2 };
    const rect = { ...spot, ...STEP };
    const y = rect.y + rect.h / 2 + cap(m.fonts.badge) / 2;
    const line: TagLine = { x: rect.x + (rect.w - textWidth(text, m.fonts.badge)) / 2, y, text, font: 'badge' };
    return { rect, lines: [line], tone: 'core', route: b.route };
  });
}
