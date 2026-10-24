import { arg, attr, id, optionalArg, statement, text } from '@diagrist/lang';
import { lifeline, lifelines, message } from './values.js';

const over = attr(
  lifelines(),
  'Lifelines it spans, comma separated without spaces, like `over=auftrag,lager`. Required.',
);

export const note = statement('note', {
  doc: 'A note at this point of the time axis, over the lifelines of `over=`. Long texts wrap.',
  examples: ['note "Idempotency key = order number" over=api,db'],
  arguments: [arg('text', text(), 'What the note says.')],
  attributes: { over },
});

export const ref = statement('ref', {
  doc: 'A reference to another interaction (interaction use): a frame tagged `ref` over the lifelines of `over=`. With `id=r` the messages right after it that name `r` as an end run to its edge (actual gates, `r.name` names them), and the frame grows to hold them.',
  examples: ['ref "Authorize payment" over=payment,psp id=pay file="authorize-payment.dgr"'],
  arguments: [arg('label', text(), 'Name of the referenced interaction.')],
  attributes: {
    over,
    id: attr(id(), 'Name of the frame, for messages that start or end at its edge.'),
    file: attr(text(), 'File of the referenced sequence diagram, relative to this one; named in the description.'),
  },
});

export const invariant = statement('invariant', {
  doc: 'A state invariant (UML 2.5.1, 17.2.4) at this point on the lifeline `on=`: a condition in `{...}`, or with `state` a state in a rounded box.',
  examples: ['invariant "logged in" on=bff state'],
  arguments: [arg('text', text(), 'The condition or state, without braces.')],
  attributes: { on: attr(lifeline(), 'The lifeline the invariant holds on. Required.') },
  flags: { state: 'Draws a state in a rounded box instead of a condition in braces.' },
});

export const divider = statement('divider', {
  doc: 'A divider on the time axis: a double line across all lifelines with the text in a box in the middle. Only at the top level, not inside a fragment.',
  examples: ['divider "Accept the webhook"'],
  arguments: [optionalArg('label', text(), 'Name of the section that starts here.')],
});

export const frame = statement('frame', {
  doc: 'A frame around the whole interaction with `sd Name` in its tag (UML 2.5.1, 17.2). Without a name it shows the title. Gates (`gate` in `msg`) draw the frame without this line too.',
  examples: ['frame "OAuth callback"'],
  arguments: [optionalArg('label', text(), 'Name of the interaction in the tag; defaults to the title.')],
});

export const autonumber = statement('autonumber', {
  doc: 'Numbers all messages in source order (1, 2, 3 ...), across fragments; the number stands before the label.',
  examples: ['autonumber'],
});

export const duration = statement('duration', {
  doc: 'A duration constraint (UML 2.5.1, 8.4) between two messages with `id=`: a bracket from the first to the second, left of the lifeline both touch when there is room, otherwise mirrored to the right or at the left edge. The text is written without braces; Diagrist adds `{...}`.',
  examples: ['duration request response "≤ 300 ms"'],
  arguments: [
    arg('from', message(), 'The earlier message.'),
    arg('to', message(), 'The later message.'),
    arg('text', text(), 'The constraint, without braces.'),
  ],
});

export const time = statement('time', {
  doc: 'A time constraint of one message with `id=`: a tick at its height left of its lifeline or at the left edge, the text in `{...}`.',
  examples: ['time request "t = now"'],
  arguments: [arg('at', message(), 'The message.'), arg('text', text(), 'The constraint, without braces.')],
});
