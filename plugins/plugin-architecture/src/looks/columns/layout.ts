import type { Rect } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import type { EdgeLabel, GridLayout, Route } from '@diagrist/layout-grid';
import { WORDS } from '@diagrist/parts';
import type { Badge } from '../../layout/marks.js';
import type { Metrics } from '../../layout/metrics.js';
import type { ArchitectureModel } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import { bandsOf, rowBandsOf, withoutBandFrames } from './bands.js';
import { focusOf } from './focus.js';
import { type ColumnsSheet, columnsSheet } from './sheet.js';
import { COLUMNS_WORDS } from './words.js';

/** What the grid placed, routed and labelled, for the sheet around it. */
export interface Placement {
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly badges: readonly Badge[];
}

/** Half the size of a flow number, as an obstacle for the separators. */
const BADGE_R = 9;

const union = (boxes: readonly Rect[]): Rect => {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
};

/** The model the grid of `look=columns` places: without the frames that name a column band. */
export const columnsGridModel = (model: ArchitectureModel): ArchitectureModel =>
  withoutBandFrames(model, bandsOf(model));

/**
 * The sheet of `look=columns` around a placed picture: its bands named, the separators broken where labels, flow
 * numbers, boxes or frames meet them, the side column and the footer.
 */
export function columnsSheetOf(
  model: ArchitectureModel,
  placement: Placement,
  texts: Texts,
  locale: Locale,
  m: Metrics,
): ColumnsSheet {
  const { grid, routes, labels, badges } = placement;
  const bands = bandsOf(model);
  const badgeBoxes = badges.map((b) => ({ x: b.x - BADGE_R, y: b.y - BADGE_R, w: 2 * BADGE_R, h: 2 * BADGE_R }));
  const solid = [...grid.nodes.map((n) => n.rect), ...grid.groups.map((g) => g.rect)];
  const lines = routes.flatMap((r) => r.points.map(([x, y]) => ({ x, y, w: 0, h: 0 })));
  const content = union([...solid, ...lines, ...labels.map((l) => l.box), ...badgeBoxes]);
  return columnsSheet(
    {
      model,
      bands,
      layers: rowBandsOf(model, bands),
      cols: grid.cols,
      rows: grid.rows,
      content,
      obstacles: [...solid, ...labels.map((l) => l.box), ...badgeBoxes],
      focus: focusOf(model),
      texts,
      words: COLUMNS_WORDS[locale],
      open: WORDS[locale].open,
    },
    m,
  );
}
