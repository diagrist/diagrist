import {
  arg,
  arrow,
  formatDiagnostic,
  grammarOf,
  id,
  kind,
  optionalArg,
  read,
  readKind,
  ref,
  statement,
  text,
} from '@diagrist/lang';
import type { Engine } from '../../src/index.js';

const participant = statement('participant', {
  doc: 'A lifeline.',
  examples: ['participant api "API"'],
  arguments: [arg('id', id(), 'Id that messages refer to.'), optionalArg('label', text(), 'Name in the head.')],
});

const msg = statement('msg', {
  doc: 'A message between two lifelines.',
  examples: ['msg client -> api "GET /orders"'],
  arguments: [
    arg('from', ref('participant'), 'Sender.'),
    arg('arrow', arrow(['->', '-->']), '`->` call, `-->` reply.'),
    arg('to', ref('participant'), 'Receiver.'),
    optionalArg('label', text(), 'What is sent.'),
  ],
});

const sequence = kind('sequence', {
  doc: 'Messages between lifelines over time.',
  statements: [participant, msg],
});

/**
 * A stand-in for the kernel with one real kind: it reads and checks with the language's tables, so its
 * findings are real diagnostics, and its picture is a fixed SVG naming the diagram.
 */
export function fakeEngine(): Engine {
  return {
    compile: (source, { locale }) => {
      const reading = read(source);
      const checked = readKind(sequence, reading.document);
      const diagnostics = [...reading.diagnostics, ...checked.diagnostics].map((found) => ({
        ...found,
        message: formatDiagnostic(found, locale),
      }));
      const failed = diagnostics.some((d) => d.severity === 'error');
      return failed ? { diagnostics } : { svg: `<svg>${checked.header?.title ?? ''}</svg>`, diagnostics };
    },
    kinds: () => [sequence.name],
    grammar: (name) => (name === sequence.name ? grammarOf(sequence) : undefined),
  };
}

export const LOGIN =
  'diagram sequence "Login"\nparticipant client "Browser"\nparticipant api "API"\nmsg client -> api "POST /login"\n';
