import { arg, arrow, attr, type Infer, id, optionalArg, type Span, statement, text } from '@diagrist/lang';

/** An entry of the decision bar below the picture (ADR 0002 Nr. 3: its own keyword, `adr`). */
export const adr = statement('adr', {
  doc: 'An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. `mark=` with its id puts the mark into the picture.',
  examples: ['adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"'],
  arguments: [
    arg('id', id(), 'Id of the decision, such as `E1`; `mark=E1` refers to it.'),
    arg('question', text(), 'The question that was decided.'),
    arg('equals', arrow(['=']), 'Separates the question from the choice.'),
    arg('choice', text(), 'The chosen option.'),
    optionalArg('then', arrow(['=>']), 'Introduces the consequence.'),
    optionalArg('consequence', text(), 'What follows from the choice.'),
  ],
  attributes: { open: attr(text(), 'Who still decides an open question; the card is drawn dashed.') },
});

/** An entry of the decision bar; `mark=` on an element shows its id in the picture. */
export interface Decision {
  readonly id: string;
  readonly question: string;
  readonly choice: string;
  readonly consequence?: string;
  /** Who still decides; an open decision is drawn dashed. */
  readonly open?: string;
  readonly span: Span;
}

/** The decision an `adr` statement states; optional fields are left out instead of set to `undefined`. */
export function decisionOf(s: Infer<typeof adr>): Decision {
  const { id, question, choice, consequence, span } = s;
  const open = s.attributes.open;
  return {
    id,
    question,
    choice,
    ...(consequence === undefined ? {} : { consequence }),
    ...(open === undefined ? {} : { open }),
    span,
  };
}
