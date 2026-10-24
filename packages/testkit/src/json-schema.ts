type Schema = Readonly<Record<string, unknown>> | boolean;

type ObjectSchema = Exclude<Schema, boolean>;

/** Keywords that only annotate; they never make a value invalid. */
const ANNOTATIONS = new Set(['$schema', '$id', '$comment', '$defs', 'title', 'description', 'examples']);

/**
 * Keywords `validateJson` checks: those Diagrist's schemas use. Any other keyword in a schema is an error, so nothing
 * is skipped silently; add a keyword here together with its check when a schema needs it.
 */
const CHECKED = new Set([
  '$ref',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'minItems',
  'anyOf',
  'pattern',
  'minLength',
]);

/**
 * Validates a value against the subset of JSON Schema 2020-12 that Diagrist's schemas use, and returns one message
 * per violation with its JSON Pointer, or none. `$ref` resolves `#/$defs/...` against `root`. A keyword outside the
 * subset, or `type` as a list, throws, so a schema cannot rely on a check this function does not make.
 */
export function validateJson(schema: Schema, value: unknown, root: Schema = schema, at = ''): string[] {
  const here = at || '/';
  if (typeof schema === 'boolean') return schema ? [] : [`${here}: not allowed`];
  const unsupported = Object.keys(schema).filter((key) => !ANNOTATIONS.has(key) && !CHECKED.has(key));
  if (schema.type !== undefined && typeof schema.type !== 'string') unsupported.push('type as a list');
  if (unsupported.length > 0) throw new Error(`validateJson does not support ${unsupported.join(', ')} (at ${here})`);
  const nested = (sub: unknown, child: unknown, path: string): string[] =>
    validateJson(sub as Schema, child, root, path);

  const problems = schema.$ref === undefined ? [] : nested(resolve(root, String(schema.$ref)), value, at);
  if (schema.type !== undefined && !hasType(value, String(schema.type))) {
    return [...problems, `${here}: expected ${schema.type}, found ${typeOf(value)}`];
  }
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((sub) => nested(sub, value, at).length === 0)) {
    problems.push(`${here}: matches none of anyOf`);
  }
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && [...value].length < schema.minLength)
      problems.push(`${here}: too short`);
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
      problems.push(`${here}: does not match ${schema.pattern}`);
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      problems.push(`${here}: fewer than ${schema.minItems} items`);
    }
    if (schema.items !== undefined)
      problems.push(...value.flatMap((item, i) => nested(schema.items, item, `${at}/${i}`)));
  }
  if (typeOf(value) === 'object') problems.push(...objectProblems(schema, value as ObjectSchema, nested, at));
  return problems;
}

/** Own properties only: a name such as `constructor` is a property like any other, not one of `Object.prototype`. */
function objectProblems(
  schema: ObjectSchema,
  value: ObjectSchema,
  nested: (sub: unknown, child: unknown, path: string) => string[],
  at: string,
): string[] {
  const properties = (schema.properties ?? {}) as ObjectSchema;
  const missing = ((schema.required ?? []) as string[])
    .filter((name) => !Object.hasOwn(value, name))
    .map((name) => `${at || '/'}: missing ${name}`);
  return [
    ...missing,
    ...Object.entries(value).flatMap(([name, child]) => {
      const sub = Object.hasOwn(properties, name) ? properties[name] : schema.additionalProperties;
      return sub === undefined ? [] : nested(sub, child, `${at}/${name}`);
    }),
  ];
}

function resolve(root: Schema, ref: string): Schema {
  const name = /^#\/\$defs\/(.+)$/.exec(ref)?.[1];
  const defs = (typeof root === 'object' ? (root.$defs ?? {}) : {}) as ObjectSchema;
  if (name === undefined || !Object.hasOwn(defs, name)) throw new Error(`validateJson cannot resolve ${ref}`);
  return defs[name] as Schema;
}

function hasType(value: unknown, type: string): boolean {
  return type === 'integer' ? Number.isInteger(value) : typeOf(value) === type;
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
