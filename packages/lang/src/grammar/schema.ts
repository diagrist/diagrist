import type { Grammar, GrammarField, GrammarLine, GrammarReference, GrammarStatement } from './describe.js';

/** A JSON Schema (draft 2020-12) as plain data. */
export type JsonSchema = Readonly<Record<string, unknown>>;

interface RequiredProperty {
  readonly schema: JsonSchema;
  readonly optional?: never;
}

interface OptionalProperty {
  readonly schema: JsonSchema;
  readonly optional: true;
}

/**
 * One entry per field of `T`, marked `optional` exactly when the field is optional in `T`. A field added to the
 * interfaces in `describe.ts` without a schema here, or with the wrong optionality, does not compile.
 */
type Properties<T> = {
  readonly [K in keyof T]-?: Record<never, never> extends Pick<T, K> ? OptionalProperty : RequiredProperty;
};

const required = (schema: JsonSchema): RequiredProperty => ({ schema });
const optional = (schema: JsonSchema): OptionalProperty => ({ schema, optional: true });

function object<T>(description: string, properties: Properties<T>): JsonSchema {
  const entries: [string, RequiredProperty | OptionalProperty][] = Object.entries(properties);
  return {
    description,
    type: 'object',
    properties: Object.fromEntries(entries.map(([name, property]) => [name, property.schema])),
    required: entries.filter(([, property]) => property.optional !== true).map(([name]) => name),
    additionalProperties: false,
  };
}

const nonEmpty = (description: string): JsonSchema => ({ type: 'string', minLength: 1, description });
const listOf = (items: JsonSchema, description: string): JsonSchema => ({ type: 'array', items, description });
const def = (name: string): JsonSchema => ({ $ref: `#/$defs/${name}` });

type Flag = GrammarLine['flags'][number];

const field = object<GrammarField>('One value of a line: an argument, a clause, an attribute or a header field.', {
  name: required(nonEmpty('Name of an argument; keyword of a clause; key of an attribute without `=`.')),
  doc: required(nonEmpty('What the value means and what happens when it is left out.')),
  type: required(nonEmpty('The value type, such as `id`, `ref`, `text`, `oneOf` or `arrow`; plugins add their own.')),
  expected: required(nonEmpty('What a correct value looks like, as diagnostics phrase it.')),
  optional: optional({ type: 'boolean', description: 'Arguments only: whether the argument may be left out.' }),
  choices: optional(listOf({ type: 'string' }, 'The complete list of allowed values, when there is one.')),
  meanings: optional({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'What each choice stands for, by choice, such as the arrows of a message.',
  }),
  refersTo: optional(listOf({ type: 'string' }, 'Keywords of the statements whose ids this value refers to.')),
});

const flag = object<Flag>('A single word after the arguments that switches something on.', {
  name: required(nonEmpty('The word.')),
  doc: required(nonEmpty('What it does.')),
});

const lineProperties: Properties<GrammarLine> = {
  doc: required(nonEmpty('What the line does.')),
  examples: required({
    ...listOf({ type: 'string' }, 'Complete lines as an agent would write them; each reads without diagnostics.'),
    minItems: 1,
  }),
  arguments: required(listOf(def('field'), 'Positional values in order; optional ones may be left out.')),
  clauses: required(listOf(def('field'), 'Keyword-value pairs after the arguments, such as `in backend`.')),
  attributes: required(listOf(def('field'), 'Attributes written `key=value` after the keyword.')),
  flags: required(listOf(def('flag'), 'Single words after the arguments.')),
};

const line = object<GrammarLine>(
  'The shape of an indented line without keyword (a line form, ADR 0006).',
  lineProperties,
);

const statement = object<GrammarStatement>('A statement, described in full.', {
  ...lineProperties,
  keyword: required(nonEmpty('The first word of the line.')),
  children: required(
    listOf(
      { anyOf: [def('statement'), def('reference')] },
      'Statements allowed indented below this one, in full or as a reference to their description.',
    ),
  ),
  lines: optional({ ...def('line'), description: 'The form of indented lines that start without a child keyword.' }),
});

const reference = object<GrammarReference>('A statement described in full elsewhere in the same grammar.', {
  keyword: required(nonEmpty('The first word of the line.')),
  ref: required({
    type: 'string',
    pattern: '^/statements/[0-9]+(/children/[0-9]+)*$',
    description: 'JSON Pointer (RFC 6901) from the root of the grammar to the full description.',
  }),
});

const grammar = object<Grammar>('', {
  kind: required(nonEmpty('Name of the kind, as written in `diagram <kind> "Title"`.')),
  doc: required(nonEmpty('What the kind draws.')),
  header: required(listOf(def('field'), 'Attributes of the first line, `diagram <kind> "Title"`.')),
  statements: required(listOf(def('statement'), 'Statements allowed at the top level, each in full.')),
});

/**
 * The JSON Schema of a grammar as `grammarOf` returns it and `dgr grammar <kind> --json` prints it, so agents and
 * tools can validate what they read. It is typed against the interfaces it describes (see `Properties`), which keeps
 * the two from drifting; hosts add `$id` and a header when they publish it.
 */
export const GRAMMAR_SCHEMA: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Diagrist grammar of a diagram kind',
  ...grammar,
  description:
    'Everything a diagram kind allows, derived from its statement tables (ADR 0004). Each table is described in full once; other occurrences are references.',
  $defs: { field, flag, line, statement, reference },
};
