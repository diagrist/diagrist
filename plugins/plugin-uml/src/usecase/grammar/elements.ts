import { TONE_NAMES } from '@diagrist/core';
import { arg, attr, id, oneOf, ref, statement, text } from '@diagrist/lang';

const tone = (what: string) => attr(oneOf(TONE_NAMES), `Colour of ${what} in \`look=cards\`; without it slate.`);
const mark = attr(ref('adr'), 'Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it.');
const emph = { emph: 'Highlights it in the accent colour.' };

export const actor = statement('actor', {
  doc: 'An actor (UML 2.5.1, 18.1.3): a role outside every subject, drawn as a stick figure with the role below it or, with `kind=system`, as a box with `«actor»` for another system. It has no `in`: actors stand outside the subject. Diagrist puts it left or right of its use cases.',
  examples: ['actor customer "Customer"', 'actor psp "Payment provider" kind=system side=right'],
  arguments: [
    arg('id', id(), 'Id that `rel` and `note` use for this actor.'),
    arg('label', text(), 'Name of the role.'),
  ],
  attributes: {
    kind: attr(oneOf(['person', 'system']), '`person` (default) draws a stick figure, `system` a box with `«actor»`.'),
    side: attr(oneOf(['left', 'right']), 'Side of the subject the actor stands on; without it Diagrist chooses.'),
    tone: tone('the figure or box'),
    mark,
  },
  flags: emph,
});

export const subject = statement('subject', {
  doc: 'A subject (UML 2.5.1, 18.1.3): the system the use cases belong to, drawn as a rectangle with its name at the top left around the use cases `in` it.',
  examples: ['subject shop "Online shop"'],
  arguments: [
    arg('id', id(), 'Id that `usecase ... in` and `note ... on` use for this subject.'),
    arg('label', text(), 'Name of the system.'),
  ],
  attributes: { tone: tone('its area') },
});

export const usecase = statement('usecase', {
  doc: 'A use case (UML 2.5.1, 18.1.3): an ellipse as large as its name inside the subject `in`; names over 18 characters wrap. `points=` lists extension points in a compartment, which `extend` names with `at=`. `form=classifier` draws a rectangle with a small ellipse instead (18.2.4). Diagrist places use cases in columns: included and extending cases right of their base, a special case below its general one.',
  examples: ['usecase order "Place order" in shop points="before checkout"'],
  arguments: [
    arg('id', id(), 'Id that `rel` and `note` use for this use case.'),
    arg('label', text(), 'Name of the goal, as a verb phrase.'),
  ],
  clauses: { in: attr(ref('subject'), 'The subject the use case belongs to; without it it stands outside.') },
  attributes: {
    points: attr(text(), 'Extension points separated by commas, like `"before checkout, after payment"`.'),
    form: attr(oneOf(['ellipse', 'classifier']), '`ellipse` (default), or `classifier`: a rectangle with an ellipse.'),
    stereotype: attr(text(), 'Stereotype above the name, written without guillemets: `batch` shows `«batch»`.'),
    tone: tone('the outline'),
    mark,
  },
  flags: emph,
});

export const note = statement('note', {
  doc: 'A comment (UML 2.5.1, 7.2.4) on an actor, a use case or a subject: a box with a folded corner at a free spot nearby, joined to it by a dashed line. On a subject it stands outside every subject.',
  examples: ['note "Only private customers" on shop'],
  arguments: [arg('text', text(), 'What the note says; long texts wrap at word boundaries.')],
  clauses: { on: attr(ref('actor', 'usecase', 'subject'), 'The element the note belongs to. Required.') },
});
