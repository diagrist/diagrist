import { TONE_NAMES } from '@diagrist/core';
import { arg, attr, id, oneOf, statement, text } from '@diagrist/lang';

/** One head statement per lifeline shape; they share arguments, attributes and flags. */
function head<const K extends string>(keyword: K, shape: string, example: string) {
  return statement(keyword, {
    doc: `A lifeline drawn as ${shape}, from left to right in source order. Messages, notes and references name it by its id.`,
    examples: [example],
    arguments: [
      arg('id', id(), 'Id that messages, `activate`, `note` and `ref` use for this lifeline.'),
      arg('label', text(), 'Name shown in the head.'),
    ],
    attributes: {
      stereotype: attr(text(), 'Stereotype above the name, written without guillemets: `service` shows `«service»`.'),
      tone: attr(oneOf(TONE_NAMES), 'Colour of the head and its bars in `look=cards`; without it the head is slate.'),
    },
    flags: { external: 'Draws the head dashed: the system is outside the scope of the diagram.' },
  });
}

export const participant = head('participant', 'a box', 'participant api "api-service" stereotype="service"');
export const actor = head('actor', 'a stick figure', 'actor customer "Customer"');
export const database = head('database', 'a cylinder', 'database db "Orders DB"');
export const queue = head('queue', 'a horizontal tube', 'queue broker "Kafka"');
export const boundary = head('boundary', 'the boundary symbol of robustness analysis', 'boundary form "Order form"');
export const control = head('control', 'the control symbol of robustness analysis', 'control checkout "Checkout"');
export const entity = head('entity', 'the entity symbol of robustness analysis', 'entity order "Order"');
