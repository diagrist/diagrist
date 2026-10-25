import {
  arg,
  arrow,
  formatDiagnostic,
  grammarOf,
  id,
  kind,
  optionalArg,
  read,
  ref,
  statement,
  text,
  unfold,
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
 * A stand-in for the kernel with one real kind: it reads, unfolds and checks with the language's tables, so its
 * findings, pictures and needs are real, and each picture is a fixed SVG naming its title.
 */
export function fakeEngine(): Engine {
  return {
    compile: (source, { locale, path, files }) => {
      const reading = read(source);
      const unfolded = unfold(sequence, reading.document, { ...(path ? { path } : {}), ...(files ? { files } : {}) });
      const found = [
        ...reading.diagnostics,
        ...unfolded.diagnostics,
        ...unfolded.pictures.flatMap((p) =>
          p.reading.diagnostics.map((d) => (p.variant ? { ...d, picture: p.variant } : d)),
        ),
      ];
      const diagnostics = found.map((d) => ({ ...d, message: formatDiagnostic(d, locale) }));
      const failed = diagnostics.some((d) => d.severity === 'error');
      const pictures = unfolded.pictures.map((p) => ({
        ...(p.variant ? { variant: p.variant } : {}),
        ...(failed ? {} : { svg: `<svg>${p.reading.header?.title ?? ''}</svg>` }),
      }));
      return { pictures, diagnostics, needs: unfolded.needs };
    },
    kinds: () => [sequence.name],
    grammar: (name) => (name === sequence.name ? grammarOf(sequence) : undefined),
  };
}

export const LOGIN =
  'diagram sequence "Login"\nparticipant client "Browser"\nparticipant api "API"\nmsg client -> api "POST /login"\n';
