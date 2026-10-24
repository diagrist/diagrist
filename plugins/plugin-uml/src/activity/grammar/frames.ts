import { TONE_NAMES } from '@diagrist/core';
import { arg, attr, id, oneOf, optionalArg, statement, text } from '@diagrist/lang';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';

export const partition = statement(
  'partition',
  implementing(
    { uml: [ACTIVITIES.partition] },
    {
      doc: 'A partition, drawn as a vertical swimlane with its name in a head. Lanes stand from left to right in source order; nodes join one with `in`. Without any partition the activity has one invisible lane.',
      examples: ['partition customer "Customer"', 'partition billing "Billing" tone=purple'],
      arguments: [
        arg('id', id(), 'Id that `in` uses for this lane.'),
        arg('label', text(), 'Who is responsible, such as a role or a system.'),
      ],
      attributes: { tone: attr(oneOf(TONE_NAMES), 'Colour of the lane head in `look=cards`; without it slate.') },
    },
  ),
);

export const interruptible = statement(
  'interruptible',
  implementing(
    { uml: [ACTIVITIES.interruptibleRegion] },
    {
      doc: 'An interruptible activity region: a dashed, rounded frame around the nodes with `interruptible=id`. An interrupting edge `~>` leaving it stops everything inside. The name stands small at the top left of the frame where there is room, otherwise one line lower, at the bottom, wrapped, or only in the description.',
      examples: ['interruptible cancel "Cancellation by the customer"'],
      arguments: [
        arg('id', id(), 'Id that `interruptible=` on nodes uses for this region.'),
        optionalArg('label', text(), 'Name of the region.'),
      ],
    },
  ),
);

/** How an expansion region runs per element. */
export const EXPANSION_MODES = ['iterative', 'parallel', 'stream'] as const;

export const expansion = statement(
  'expansion',
  implementing(
    { uml: [ACTIVITIES.expansionRegion, ACTIVITIES.expansionNode] },
    {
      doc: 'An expansion region: a dashed, rounded frame around the nodes with `expansion=id`, run once per element of a collection, with its mode as `«iterative»`, `«parallel»` or `«stream»` at the top left. Its id in `go` stands for its expansion nodes, rows of four small boxes on the frame: `go a => region` from outside ends at the input on the top edge, `go region => x` inside starts there; `go y => region` from inside ends at the output on the bottom edge, `go region => b` outside starts there. The output is drawn only when an edge uses it.',
      examples: [
        'expansion each "Check every item" mode=parallel',
        'expansion prices "Price per item" input="Items, Price list" output="Prices, Errors"',
      ],
      arguments: [
        arg('id', id(), 'Id that `expansion=` on nodes and the ends of `go` use for this region.'),
        optionalArg('label', text(), 'Name of the region, beside its mode.'),
      ],
      attributes: {
        mode: implementing(
          {
            values: { iterative: [ACTIVITIES.iterative], parallel: [ACTIVITIES.parallel], stream: [ACTIVITIES.stream] },
          },
          attr(
            oneOf(EXPANSION_MODES),
            'How the elements run: `iterative` (default) one after the other, `parallel` at the same time, `stream` as a stream.',
          ),
        ),
        input: implementing(
          { uml: [ACTIVITIES.expansionNode] },
          attr(
            text(),
            'Named inputs separated by commas, side by side on the top edge; `pin=` on `go` picks one. Without it the region has one unnamed input.',
          ),
        ),
        output: implementing(
          { uml: [ACTIVITIES.expansionNode] },
          attr(
            text(),
            'Named outputs separated by commas, side by side on the bottom edge; `pin=` on `go` picks one. Without it the region has at most one unnamed output.',
          ),
        ),
      },
    },
  ),
);
