import type { Icon } from '@diagrist/core';
import { LUCIDE } from './lucide.js';
import { SIMPLE_ICONS } from './simple-icons.js';

/** How an icon is painted: Lucide icons are lines, Simple Icons are filled shapes. */
export type IconStroke = 'line' | 'fill';

/** Every icon by name with how it is painted, Lucide first, in the order of their names. */
const ALL: ReadonlyMap<string, IconStroke> = new Map(
  [
    ...Object.keys(LUCIDE).map((name) => [name, 'line'] as const),
    ...Object.keys(SIMPLE_ICONS).map((name) => [name, 'fill'] as const),
  ].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
);

/** The names `icon=` accepts, sorted, for the statement tables and their diagnostics. */
export const ICON_NAMES: readonly string[] = [...ALL.keys()];

/** Whether the icon of this name is drawn with lines or filled; filled for a name that is no icon. */
export const iconStroke = (name: string): IconStroke => ALL.get(name) ?? 'fill';

/**
 * The icons for the style table. They keep the predecessor's markup, so pictures keep its bytes; `paths` for the
 * kernel's clean form follow with the clean-up (docs/burn-down.md).
 */
export const ICONS: Readonly<Record<string, Icon>> = Object.fromEntries(
  Object.entries({ ...LUCIDE, ...SIMPLE_ICONS }).map(([name, markup]) => [name, { size: 24, paths: [], markup }]),
);
