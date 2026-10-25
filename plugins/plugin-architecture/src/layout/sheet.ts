import type { Locale } from '@diagrist/lang';
import type { GridLayout, Route } from '@diagrist/layout-grid';
import { type Sheet, sheetOf, WORDS } from '@diagrist/parts';
import type { Look } from '../looks/look.js';
import type { ArchGroup, ArchitectureModel } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { SENTENCE_WORDS } from '../texts/sentence.js';
import type { Context } from './focus.js';
import { legendSentences } from './sentence.js';

/** Pictures wider than this put their notes below with `decisions=auto`, so a printed page keeps its texts legible. */
const NOTES_BELOW_FROM = 1100;

/** What the picture holds that the sheet sets its notes and sentences around. */
export interface SheetContent {
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly frames: readonly ArchGroup[];
  readonly marked: boolean;
  readonly context: Context;
  /** Width of the picture without notes, and the lower edge of what is drawn. */
  readonly width: number;
  readonly bottom: number;
}

/**
 * The sheet around a picture with `decisions: notes` or `legend: sentence`: the notes beside the picture or below it
 * as `decisions=` says, and the legend as sentences in the look's words; none for other looks.
 */
export function sheetFor(
  model: ArchitectureModel,
  look: Look,
  content: SheetContent,
  texts: Texts,
  locale: Locale,
): Sheet | undefined {
  const { options: o, metrics: m } = look;
  if (o.decisions !== 'notes' && o.legend !== 'sentence') return undefined;
  const { grid, width } = content;
  const at = model.decisionsAt;
  const place = at === 'auto' ? (width > NOTES_BELOW_FROM ? 'below' : 'right') : at;
  const shown = {
    routes: content.routes,
    frames: content.frames,
    marked: content.marked,
    below: place === 'below',
    context: content.context.nodes.size + content.context.edges.size > 0,
  };
  const words = { ...SENTENCE_WORDS[locale], ...look.paint.sights?.[locale] };
  return sheetOf({
    decisions: o.decisions === 'notes' ? model.decisions : [],
    notes: place,
    sentences: o.legend === 'sentence' ? legendSentences(model, shown, look, texts, words) : [],
    top: Math.min(...grid.groups.map((g) => g.rect.y), ...grid.nodes.map((n) => n.rect.y)),
    right: width - m.marginX,
    bottom: content.bottom,
    width,
    margin: m.margin,
    open: WORDS[locale].open,
    font: look.fonts.label,
  });
}
