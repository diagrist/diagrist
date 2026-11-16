import type { Look } from '../looks/look.js';
import type { Spacing } from '../model/types.js';

/** How much each level of `spacing=` multiplies the room of `normal`. */
const FACTOR: Readonly<Record<Spacing['level'], number>> = { compact: 0.7, normal: 1, loose: 1.4 };

/** The room of `layout=star` at `spacing=normal`, in pixels. */
const STAR = { ring: 48, gap: 40, label: 6 } as const;

/** The room of a star: shortest line from the hub, room between neighbours, text beside its line. */
export interface StarRoom {
  readonly ring: number;
  readonly gap: number;
  readonly label: number;
  /** How much the level widens or narrows the rest, such as the room round frames. */
  readonly factor: number;
}

const scaled = (base: number, factor: number, given: number | undefined): number => given ?? Math.round(base * factor);

/** The room of a star from the level and the measures set one by one. */
export function starRoom(spacing: Spacing): StarRoom {
  const f = FACTOR[spacing.level];
  return {
    ring: scaled(STAR.ring, f, spacing.ring),
    gap: scaled(STAR.gap, f, spacing.gap),
    label: scaled(STAR.label, f, spacing.label),
    factor: f,
  };
}

/**
 * The look with the room of the grid and the margin as `spacing` asks: the gaps between columns and rows and the
 * margin scaled by the level, single measures over that. At `normal` without measures the look stays as it is.
 */
export function spacedLook(look: Look, spacing: Spacing): Look {
  const f = FACTOR[spacing.level];
  if (f === 1 && spacing.cols === undefined && spacing.rows === undefined && spacing.margin === undefined) return look;
  const m = look.metrics;
  return {
    ...look,
    metrics: {
      ...m,
      colGap: scaled(m.colGap, f, spacing.cols),
      subColGap: Math.round(m.subColGap * (spacing.cols === undefined ? f : spacing.cols / m.colGap)),
      rowGap: scaled(m.rowGap, f, spacing.rows),
      marginX: scaled(m.marginX, f, spacing.margin),
    },
  };
}
