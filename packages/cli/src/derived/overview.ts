import type { Plugin } from '@diagrist/core';
import { summaryOf } from '../commands/usage.js';
import { LANGUAGE_BASICS } from './basics.js';
import { kernelCodes, languageCodes } from './codes.js';
import { code, generatedFrom, table } from './markdown.js';

/** Where the overview of the language is checked in, relative to the repository root. */
export const OVERVIEW_PATH = 'docs/language/README.md';

/** Where the JSON Schema of the grammar is checked in, relative to the repository root. */
export const SCHEMA_PATH = 'schemas/grammar.schema.json';

/**
 * The overview of the language: how every file is written, the kinds with links to their specs, where the grammar
 * is available as data, and the codes of the language and the kernel, which every kind can report.
 */
export function languageOverview(plugins: readonly Plugin[]): string {
  const kinds = plugins.flatMap((plugin) => plugin.kinds.map((kind) => ({ plugin: plugin.name, spec: kind.spec })));
  return [
    generatedFrom('the statement tables of every kind and the catalogues of the language and the kernel'),
    '',
    '# The Diagrist language',
    '',
    ...LANGUAGE_BASICS.flatMap((paragraph) => [paragraph, '']),
    '## Kinds',
    '',
    'Each kind has its own page with every statement, its parts, examples and the codes of its rules.',
    '',
    ...table(
      ['Kind', 'Plugin', 'What it draws'],
      kinds.map(({ plugin, spec }) => [`[${code(spec.name)}](${spec.name}.md)`, code(plugin), summaryOf(spec.doc)]),
    ),
    '',
    '## The grammar as data',
    '',
    `\`dgr grammar <kind> --json\` prints the grammar of a kind as data, derived from the same tables as these pages. It validates against the JSON Schema [\`${SCHEMA_PATH}\`](../../${SCHEMA_PATH}). Editors and the language server ask \`complete\` from \`@diagrist/lang\` what may be written at a position; it reads the same tables.`,
    '',
    '## Diagnostic codes',
    '',
    'Every finding has a stable code whose letter names who reports it: `L` the language, `K` and `G` the kernel, and one letter per plugin, such as `U` for `uml`. The codes of a kind are on its page. The messages below show each value as `{name}`; with `--json` the same values come as `values`, so tools need not parse the text.',
    '',
    'The language reports these while it reads a file against the tables of its kind:',
    '',
    ...table(['Code', 'Message'], languageCodes()),
    '',
    'The kernel reports these about kinds, icons and the placement of what the layout drew:',
    '',
    ...table(['Code', 'Message'], kernelCodes()),
    '',
  ].join('\n');
}
