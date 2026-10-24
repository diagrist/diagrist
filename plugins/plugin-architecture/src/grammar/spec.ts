import { localeAttribute } from '@diagrist/core';
import { attr, type Infer, kind, oneOf, text } from '@diagrist/lang';
import { adr } from '@diagrist/parts';
import { edgeTables } from './edges.js';
import { ELEMENT_TABLES, LEVEL_ELEMENTS, type Level } from './elements.js';
import { grid, group, layer, noteTable, style } from './frames.js';

/** The looks of the picture; `plain` is the default. */
export const LOOKS = ['plain', 'cards', 'blocks', 'paper', 'instrument'] as const;

const header = {
  subtitle: attr(text(), 'Second line below the title.'),
  label: attr(text(), 'Name before the title instead of the kind; an empty `label=""` leaves only the title.'),
  look: attr(
    oneOf(LOOKS),
    '`plain` (default) boxes with a legend, `cards` toned icon cards, `blocks` filled blocks as in pattern books, `paper` a quiet print look: Inter on paper, zones as areas, the core in yellow, decisions in the margin; `instrument` capitals in Space Grotesk on light grey, meaning in tags outside the boxes: black for the core, orange for decisions.',
  ),
  layout: attr(
    oneOf(['adaptive']),
    'Columns grow to their content and edges find their own way around obstacles; without it the grid is fixed.',
  ),
  locale: localeAttribute,
};

const DOCS: Readonly<Record<Level, string>> = {
  context:
    'A C4 system context diagram (level 1): the system as one box, the people who use it and the systems around it, placed in a named grid.',
  container:
    'A C4 container diagram (level 2): the applications and data stores of a system, grouped by responsibility, placed in a named grid.',
  component:
    'A C4 component diagram (level 3): the components inside a container and what they depend on, placed in a named grid.',
};

/**
 * All statement tables of the three levels, in the order the spec lists them. Each level keeps the elements it
 * allows; the type covers all of them, so one model serves every level.
 */
function statementsOf(level: Level) {
  const { edge, flow } = edgeTables(level);
  const elements = LEVEL_ELEMENTS[level].map((keyword) => ELEMENT_TABLES[keyword]);
  return [grid, layer, group, style, ...elements, edge, flow, noteTable(level), adr] as const;
}

/** The statement tables of one C4 level: the same tables for all levels, the elements as the level allows. */
export const architectureSpec = (level: Level) =>
  kind(level, { doc: DOCS[level], header, statements: statementsOf(level) });

/** Typed value of a top-level statement of any level, derived from the tables (ADR 0004). */
export type ArchitectureStatement = Infer<ReturnType<typeof statementsOf>[number]>;
