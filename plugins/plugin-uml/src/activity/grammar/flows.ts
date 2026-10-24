import { arg, arrow, attr, number, optionalArg, ref, statement, text } from '@diagrist/lang';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing, type SpecElement } from '../../spec/catalog.js';
import { NODE_KEYWORDS } from './values.js';

/** The arrows of `go`, what each means and the element of UML it implements; grammar and report read this table. */
const FLOW_ARROWS = {
  '->': { meaning: 'control flow', uml: [ACTIVITIES.controlFlow] },
  '=>': { meaning: 'object flow, with an object node or pin at one end at least', uml: [ACTIVITIES.objectFlow] },
  '~>': {
    meaning: 'interrupting edge out of an interruptible region, drawn with a lightning bolt',
    uml: [ACTIVITIES.interruptingEdge],
  },
} as const;

type FlowArrow = keyof typeof FLOW_ARROWS;
type Entry = { readonly meaning: string; readonly uml: readonly SpecElement[] };

const ENTRIES = Object.entries(FLOW_ARROWS) as [FlowArrow, Entry][];
const MEANINGS = Object.fromEntries(ENTRIES.map(([a, e]) => [a, e.meaning])) as Record<FlowArrow, string>;
const ELEMENTS = Object.fromEntries(ENTRIES.map(([a, e]) => [a, e.uml])) as Record<FlowArrow, readonly SpecElement[]>;

const end = () => ref(...NODE_KEYWORDS, 'expansion');

export const go = statement(
  'go',
  implementing(
    { flags: { else: [ACTIVITIES.elseGuard] } },
    {
      doc: 'An activity edge from `from` to `to`. `->` is a control flow, `=>` an object flow, `~>` an interrupting edge that leaves an interruptible region. The guard is written without brackets and drawn as `[guard]` at the start of the edge; the flag `else` is the predefined guard `[else]`. Edges run down through the layers; an edge back up runs around the nodes on the right.',
      examples: [
        'go start -> order',
        'go stock -> split "yes"',
        'go paid -> remind else',
        'go capture => receipts weight=20',
      ],
      arguments: [
        arg('from', end(), 'Node or expansion region the edge starts at.'),
        implementing({ values: ELEMENTS }, arg('arrow', arrow(MEANINGS), 'What kind of edge it is.')),
        arg('to', end(), 'Node or expansion region the edge ends at.'),
        implementing(
          { uml: [ACTIVITIES.guard] },
          optionalArg('guard', text(), 'Guard on an edge out of a decision, without brackets.'),
        ),
      ],
      attributes: {
        pin: implementing(
          { uml: [ACTIVITIES.pin] },
          attr(
            text(),
            'Pin the object flow starts or ends at, when an action or expansion region has several. Without it Diagrist takes the pin of the same name at the other end, else the next free one.',
          ),
        ),
        weight: implementing(
          { uml: [ACTIVITIES.weight] },
          attr(number({ min: 1 }), 'Tokens per traversal, drawn as `{weight=n}`.'),
        ),
      },
      flags: { else: 'The predefined guard `[else]`: taken when no other guard of the decision holds.' },
    },
  ),
);

export const handler = statement(
  'handler',
  implementing(
    { uml: [ACTIVITIES.exceptionHandler] },
    {
      doc: 'An exception handler: when the protected action throws an exception of the type, the handler action takes over, and the flow goes on at the output of the protected action. The handler has no edges of its own. Diagrist puts it beside the protected action and draws a bolt to its exception pin with the type beside it; one handler may protect several actions.',
      examples: ['handler capture -> open "Direct debit refused"'],
      arguments: [
        arg('protected', ref('action'), 'The action whose exception is handled.'),
        arg('arrow', arrow(['->']), 'Points from the protected action to the handler.'),
        arg('handler', ref('action'), 'The action that handles the exception.'),
        arg('exception', text(), 'Type of the exception.'),
      ],
    },
  ),
);
