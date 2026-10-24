import { arg, arrow, attr, id, kind, lines, oneOf, optionalArg, ref, statement, text } from '../../src/index.js';

const participant = statement('participant', {
  doc: 'A lifeline.',
  examples: ['participant api "API" stereotype="service" external'],
  arguments: [arg('id', id(), 'Id that messages refer to.'), optionalArg('label', text(), 'Name shown in the head.')],
  attributes: { stereotype: attr(text(), 'Shown in guillemets above the name.') },
  flags: { external: 'Draws the head dashed: the system is outside the scope.' },
});

const msg = statement('msg', {
  doc: 'A message from one lifeline to another.',
  examples: ['msg client -> api "GET /orders"'],
  arguments: [
    arg('from', ref('participant'), 'Sender.'),
    arg('arrow', arrow(['->', '-->']), '`->` call, `-->` reply.'),
    arg('to', ref('participant'), 'Receiver.'),
    optionalArg('label', text(), 'What is sent.'),
  ],
});

const otherwise = statement('else', {
  doc: 'The alternative branch of `alt`.',
  examples: ['else "invalid"'],
  arguments: [optionalArg('guard', text(), 'Condition of this branch.')],
  children: [msg],
});

const alt = statement('alt', {
  doc: 'Alternative branches; the first whose guard holds is taken.',
  examples: ['alt "valid"'],
  arguments: [arg('guard', text(), 'Condition of the first branch.')],
  children: [msg, otherwise],
});

export const sequence = kind('sequence', {
  doc: 'Messages between lifelines over time.',
  header: { numbering: attr(oneOf(['on', 'off']), 'Numbers the messages.') },
  statements: [participant, msg, alt],
});

const node = statement('node', {
  doc: 'A building block.',
  examples: ['node api "API" in backend tone=blue'],
  arguments: [arg('id', id(), 'Id that steps refer to.'), arg('label', text(), 'Name in the box.')],
  clauses: { in: attr(ref('group'), 'Group the node is drawn in.') },
  attributes: { tone: attr(oneOf(['blue', 'green']), 'Fill colour.') },
});

const group = statement('group', {
  doc: 'A frame around nodes.',
  examples: ['group backend "Backend"'],
  arguments: [arg('id', id(), 'Id that nodes refer to.'), arg('label', text(), 'Title of the frame.')],
});

const flow = statement('flow', {
  doc: 'A numbered sequence of steps.',
  examples: ['flow checkout "Checkout"'],
  arguments: [arg('id', id(), 'Id of the flow.'), arg('label', text(), 'Title of the flow.')],
  lines: lines({
    doc: 'One step of the flow, without a keyword.',
    examples: ['client -> api "places the order"'],
    arguments: [
      arg('from', ref('node'), 'Where the step starts.'),
      arg('arrow', arrow(['->', '~>']), '`->` synchronous, `~>` asynchronous.'),
      arg('to', ref('node'), 'Where the step ends.'),
      optionalArg('label', text(), 'What happens.'),
    ],
  }),
});

const classifier = statement('class', {
  doc: 'A UML class.',
  examples: ['class ticket "Ticket" abstract'],
  arguments: [arg('id', id(), 'Id of the class.'), arg('label', text(), 'Name of the class.')],
  flags: { abstract: 'Shows the name in italics.' },
  lines: lines({
    doc: 'A member, written as UML text.',
    examples: ['"+ total() : Money" abstract'],
    arguments: [arg('member', text(), 'Visibility, name and type, e.g. `- number : Integer`.')],
    flags: { abstract: 'An abstract operation.', static: 'A class member.' },
  }),
});

export const structure = kind('structure', {
  doc: 'Building blocks, groups, flows and classes.',
  statements: [group, node, flow, classifier],
});
