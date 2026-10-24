import { arg, attr, id, statement, text } from '@diagrist/lang';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';
import { frames, lane, mark, pins, tone } from './values.js';

const node = arg('id', id(), 'Id that `go`, `handler` and `in` use for this node.');
const card = { ...frames, tone, mark };

export const action = statement(
  'action',
  implementing(
    { uml: [ACTIVITIES.action], flags: { call: [ACTIVITIES.callBehavior] } },
    {
      doc: 'An action: a rounded box with its text; texts wider than 208 pixels wrap into two lines. `input=` and `output=` put pins on its edges, `call` marks a call behavior action with a rake at the bottom right. An action with several incoming or outgoing edges waits for all of them or starts all of them; a `merge` or `decision` usually says what is meant.',
      examples: [
        'action order "Place order" in customer',
        'action invoice "Create invoice" in billing output="Invoice" call',
      ],
      arguments: [node, arg('label', text(), 'What is done, as a verb phrase.')],
      clauses: lane,
      attributes: {
        ...card,
        input: pins('input', 'top'),
        output: pins('output', 'bottom'),
      },
      flags: { call: 'Calls an activity of its own (call behavior action): a rake at the bottom right of the box.' },
    },
  ),
);

export const object = statement(
  'object',
  implementing(
    { uml: [ACTIVITIES.objectNode] },
    {
      doc: 'An object node: a rectangle with the object type, its state below in brackets. Only object flows `=>` touch it.',
      examples: ['object invoice "Invoice" state="open" in billing'],
      arguments: [node, arg('label', text(), 'Type of the object.')],
      clauses: lane,
      attributes: {
        ...card,
        state: implementing(
          { uml: [ACTIVITIES.objectState] },
          attr(text(), 'State of the object, drawn as `[state]` below the type.'),
        ),
      },
    },
  ),
);

export const datastore = statement(
  'datastore',
  implementing(
    { uml: [ACTIVITIES.dataStore] },
    {
      doc: 'A data store: an object node with `«datastore»` above its name, whose data outlive the activity. A data store without incoming edge counts as a start.',
      examples: ['datastore accounts "Customer accounts" in payment'],
      arguments: [node, arg('label', text(), 'Name of the store.')],
      clauses: lane,
      attributes: card,
    },
  ),
);

export const buffer = statement(
  'buffer',
  implementing(
    { uml: [ACTIVITIES.centralBuffer] },
    {
      doc: 'A central buffer: an object node with `«centralBuffer»` above its name that collects objects from several flows.',
      examples: ['buffer receipts "Receipts" in accounting'],
      arguments: [node, arg('label', text(), 'Name of what is buffered.')],
      clauses: lane,
      attributes: card,
    },
  ),
);

export const send = statement(
  'send',
  implementing(
    { uml: [ACTIVITIES.sendSignal] },
    {
      doc: 'A send signal action: a pentagon pointing right with the signal. It may take input pins, never output pins.',
      examples: ['send refusal "Refusal" in service'],
      arguments: [node, arg('label', text(), 'The signal that is sent.')],
      clauses: lane,
      attributes: { ...card, input: pins('input', 'top') },
    },
  ),
);

export const accept = statement(
  'accept',
  implementing(
    { uml: [ACTIVITIES.acceptEvent] },
    {
      doc: 'An accept event action: a box with a notch on the left that waits for a signal. It may give output pins, never input pins. Without an incoming edge it starts a flow of its own, such as the trigger of an interruptible region.',
      examples: ['accept cancel "Cancellation requested" in warehouse interruptible=cancel'],
      arguments: [node, arg('label', text(), 'The signal it waits for.')],
      clauses: lane,
      attributes: { ...card, output: pins('output', 'bottom') },
    },
  ),
);

export const wait = statement(
  'wait',
  implementing(
    { uml: [ACTIVITIES.waitTime] },
    {
      doc: 'An accept time event action: an hourglass with the time beside it; the flow waits there until the time has come. Without an incoming edge it starts a flow at that time.',
      examples: ['wait period "14 days" in billing'],
      arguments: [node, arg('label', text(), 'The time or period, such as `"14 days"` or `"every Monday"`.')],
      clauses: lane,
      attributes: frames,
    },
  ),
);
