import { arg, arrow, attr, id, optionalArg, statement, text } from '@diagrist/lang';

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
