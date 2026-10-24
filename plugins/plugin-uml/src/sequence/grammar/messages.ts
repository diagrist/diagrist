import { arg, arrow, attr, id, optionalArg, ref, statement, text } from '@diagrist/lang';
import { implementing } from '../../spec/catalog.js';
import { INTERACTIONS } from '../../spec/interactions.js';
import { lifeline, messageEnd } from './values.js';

const attributes = {
  id: attr(id(), 'Name of the message that `duration` and `time` refer to.'),
  mark: attr(ref('adr'), 'Id of a decision of the decision bar, such as `E1`; the mark is drawn after the label.'),
  duration: implementing(
    { uml: [INTERACTIONS.durationConstraint] },
    attr(text(), 'Duration of the transmission: the arrow slopes down and shows the text in `{...}`.'),
  ),
};

const flags = { emph: 'Highlights the message in the accent colour.' };

/**
 * The arrows of `msg`: what each one means, which kind of message the model makes of it, and the element of UML it
 * implements. The grammar, its diagnostics, the model and the coverage report read this one table.
 */
export const ARROWS = {
  '->': { kind: 'sync', meaning: 'synchronous call (filled head)', uml: INTERACTIONS.synchronousCall },
  '~>': { kind: 'async', meaning: 'asynchronous message (open head)', uml: INTERACTIONS.asynchronousMessage },
  '-->': { kind: 'reply', meaning: 'reply (dashed, open head)', uml: INTERACTIONS.reply },
} as const;

type Arrow = keyof typeof ARROWS;

const byArrow = <T>(pick: (entry: (typeof ARROWS)[Arrow]) => T): Readonly<Record<Arrow, T>> =>
  Object.fromEntries(Object.entries(ARROWS).map(([arrow, entry]) => [arrow, pick(entry)])) as Record<Arrow, T>;

/** The ends that are no lifeline and what a message with them is. */
const OPEN_ENDS = { found: [INTERACTIONS.foundMessage], lost: [INTERACTIONS.lostMessage] };
const GATE = { gate: [INTERACTIONS.formalGate] };

export const msg = statement(
  'msg',
  implementing(
    { uml: [INTERACTIONS.message] },
    {
      doc: 'A message in source order; its arrow says what kind. Sender equal to receiver is a self call. Calls and replies activate the receiver by themselves. `found` as sender and `lost` as receiver are found and lost messages; `gate` is a gate on the frame of the interaction (`gate -> a` comes in from the left, `a --> gate` replies to the left, `a -> gate` leaves to the right), `gate.name` names it. The `id=` of a `ref` or fragment as an end leads the message to its edge.',
      examples: [
        'msg client -> api "GET /orders" id=request',
        'msg api --> client "200 OK"',
        'msg gate.order -> api "place(order)" emph',
      ],
      arguments: [
        implementing(
          { values: { found: OPEN_ENDS.found, ...GATE } },
          arg('from', messageEnd(), 'Sender: a lifeline, `found`, `gate`, or a frame with `id=`.'),
        ),
        implementing(
          { values: byArrow((entry) => [entry.uml]) },
          arg(
            'arrow',
            arrow(byArrow((entry) => entry.meaning)),
            'The kind of message, which also decides how it is drawn.',
          ),
        ),
        implementing(
          { values: { lost: OPEN_ENDS.lost, ...GATE } },
          arg('to', messageEnd(), 'Receiver: a lifeline, `lost`, `gate`, or a frame with `id=`.'),
        ),
        optionalArg('label', text(), 'What is sent; without it the arrow has no label.'),
      ],
      attributes,
      flags,
    },
  ),
);

export const create = statement(
  'create',
  implementing(
    { uml: [INTERACTIONS.createMessage] },
    {
      doc: 'A creation message: dashed with an open head, and the head of the receiver stands at its height. Before it the lifeline does not exist.',
      examples: ['create client -> meter "new MeterData()"'],
      arguments: [
        arg('from', lifeline(), 'The lifeline that creates.'),
        arg('arrow', arrow(['->']), 'Always `->`.'),
        arg('to', lifeline(), 'The lifeline that is created.'),
        optionalArg('label', text(), 'The constructor call; without it the arrow has no label.'),
      ],
      attributes,
      flags,
    },
  ),
);

export const destroy = statement(
  'destroy',
  implementing(
    { uml: [INTERACTIONS.destruction] },
    {
      doc: 'Destruction: the lifeline ends here with an X. No message reaches it afterwards.',
      examples: ['destroy session'],
      arguments: [arg('target', lifeline(), 'The lifeline that ends.')],
    },
  ),
);

export const activate = statement(
  'activate',
  implementing(
    { uml: [INTERACTIONS.executionSpecification] },
    {
      doc: 'Starts an activation bar by hand, for processing after an asynchronous message. Calls and replies need none, their bars appear by themselves. Ends with `deactivate`.',
      examples: ['activate worker'],
      arguments: [arg('target', lifeline(), 'The lifeline whose bar starts at the last message.')],
    },
  ),
);

export const deactivate = statement(
  'deactivate',
  implementing(
    { uml: [INTERACTIONS.executionSpecification] },
    {
      doc: 'Ends the bar the last `activate` of this lifeline started.',
      examples: ['deactivate worker'],
      arguments: [arg('target', lifeline(), 'The lifeline whose bar ends at the last message.')],
    },
  ),
);
