import type { ArchitectureModel } from '../model/types.js';
import { BLOCKS } from './blocks.js';
import { CARDS } from './cards.js';
import type { Look } from './look.js';
import { PAPER } from './paper.js';
import { PLAIN } from './plain.js';

/** The looks of C4 pictures by name, in the order the docs list them (ADR 0023). */
export const LOOKS = { plain: PLAIN, cards: CARDS, blocks: BLOCKS, paper: PAPER } as const satisfies Record<
  string,
  Look
>;

/** The name of a look, as `look=` takes it. */
export type LookName = keyof typeof LOOKS;

/** The names of the looks in the order of `LOOKS`: the values `look=` allows. */
export const LOOK_NAMES = Object.keys(LOOKS) as readonly LookName[];

/** The look of a picture without `look=`. */
export const DEFAULT_LOOK: LookName = 'plain';

/** The look a model is drawn in: the only place that reads its name (ADR 0023, enforced by a test). */
export const lookOf = (model: Pick<ArchitectureModel, 'look'>): Look => LOOKS[model.look];
