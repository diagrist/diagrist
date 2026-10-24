import { list, nearest } from '@diagrist/lang';
import { problem } from '../messages.js';
import { type Command, command } from './command.js';
import { grammarText } from './grammar-text.js';

/** Where the JSON Schema of the grammar is checked in, relative to the repository root; `tools/docs` writes it. */
export const SCHEMA_PATH = 'schemas/grammar.schema.json';

export const grammar: Command = command({
  name: 'grammar',
  doc: 'Shows what a diagram kind allows. It lists the header, statements, arguments, attributes, flags and line forms, each with its doc and examples. Without a kind it lists the kinds. Derived from the same tables that check the diagrams.',
  arguments: [{ name: 'kind', count: 'optional', doc: 'A diagram kind such as `sequence`.' }],
  options: {},
  examples: [
    { command: 'dgr grammar', doc: 'List the diagram kinds.' },
    { command: 'dgr grammar sequence --json', doc: 'The grammar of sequence diagrams as data, for agents.' },
  ],
  json: {
    kinds: 'Without a kind: `[{ kind, doc }]` for every kind.',
    grammar: `With a kind: its grammar as data, \`{ kind, doc, header, statements }\`; each statement lists \`keyword\`, \`doc\`, \`examples\`, \`arguments\`, \`clauses\`, \`attributes\`, \`flags\`, \`children\` and its line form \`lines\`. Each table is described once; elsewhere a child is \`{ keyword, ref }\`, where \`ref\` is a JSON Pointer into \`grammar\` such as \`/statements/9\`. It validates against the JSON Schema in \`${SCHEMA_PATH}\`.`,
  },
  async run({ arguments: { kind }, engine }) {
    const names = engine.kinds();
    if (kind === undefined) {
      const kinds = names.map((name) => ({ kind: name, doc: engine.grammar(name)?.doc ?? '' }));
      const width = Math.max(0, ...names.map((name) => name.length));
      return {
        exitCode: 0,
        json: { kinds },
        text: kinds.map((k) => `${k.kind.padEnd(width)}  ${k.doc}`).join('\n'),
      };
    }
    const found = engine.grammar(kind);
    if (found === undefined) {
      const example = `dgr grammar ${names[0] ?? 'sequence'}`;
      return problem('unknownKind', {
        found: kind,
        allowed: list(names),
        suggestion: nearest(kind, names) ?? '',
        example,
      });
    }
    return { exitCode: 0, json: { grammar: found }, text: grammarText(found) };
  },
});
