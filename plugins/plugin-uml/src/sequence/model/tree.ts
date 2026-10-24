import type { SequenceEvent } from '../diagram.js';
import type { SeqCoregion, SeqFragment, SeqItem, SeqOperand } from './types.js';

export interface Tree {
  readonly root: SeqItem[];
  readonly fragments: SeqFragment[];
  readonly coregions: SeqCoregion[];
}

/**
 * Builds the fragment tree from the flat markers. The markers come from nested statements, so they always
 * pair up. A coregion is a marker without a level of its own: its events stay in the operand around it.
 */
export function buildTree(events: readonly SequenceEvent[]): Tree {
  const root: SeqItem[] = [];
  const fragments: SeqFragment[] = [];
  const coregions: SeqCoregion[] = [];
  const open: SeqFragment[] = [];
  const nest: (SeqFragment | SeqCoregion)[] = [];
  const items = (): SeqItem[] => open.at(-1)?.operands.at(-1)?.items ?? root;

  events.forEach((event, index) => {
    switch (event.type) {
      case 'fragment': {
        const first: SeqOperand = { index, guard: event.guard, marker: 'begin', items: [] };
        const fragment: SeqFragment = {
          kind: 'fragment',
          index,
          event,
          operands: [first],
          end: undefined,
          depth: open.length,
        };
        items().push(fragment);
        fragments.push(fragment);
        open.push(fragment);
        nest.push(fragment);
        return;
      }
      case 'coregion': {
        const region: SeqCoregion = { kind: 'coregion', index, on: event.on, span: event.span, end: undefined };
        coregions.push(region);
        nest.push(region);
        items().push({ kind: 'event', index, event });
        return;
      }
      case 'operand':
        open.at(-1)?.operands.push({ index, guard: event.guard, marker: event.operator, items: [] });
        return;
      case 'end': {
        const top = nest.pop();
        if (top?.kind === 'fragment') open.pop();
        if (top) top.end = index;
        return;
      }
      default:
        items().push({ kind: 'event', index, event });
    }
  });
  return { root, fragments, coregions };
}
