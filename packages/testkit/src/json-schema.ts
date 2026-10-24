type Schema = Readonly<Record<string, unknown>>;

/** Keywords that only annotate; they never make a value invalid. */
const ANNOTATIONS = new Set(['$schema', '$id', '$comment', '$defs', 'title', 'description', 'examples']);

/** Keywords `validateJson` checks. Any other keyword in a schema is an error, so nothing is skipped silently. */
const CHECKED = new Set([
  '$ref',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'minItems',
  'enum',
  'const',
  'anyOf',
  'pattern',
  'minLength',
]);

/**
 * Validates a value against the subset of JSON Schema 2020-12 that Diagrist's schemas use, and returns one message
 * per violation with its JSON Pointer, or none. `$ref` resolves `#/$defs/...` against `root`. A keyword outside the
 * subset throws, so a schema cannot rely on a check this function does not make.
 */
export function validateJson(schema: Schema, value: unknown, root: Schema = schema, at = ''): string[] {
  const unknown = Object.keys(schema).filter((key) => !ANNOTATIONS.has(key) && !CHECKED.has(key));
  if (unknown.length > 0) throw new Error(`validateJson does not support ${unknown.join(', ')} (at ${at || '/'})`);
  const here = at || '/';
  const problems: string[] = [];
  const nested = (sub: unknown, child: unknown, path: string): string[] =>
    validateJson(sub as Schema, child, root, path);

  if (typeof schema.$ref === 'string') problems.push(...nested(resolve(root, schema.$ref), value, at));
  if (typeof schema.type === 'string' && typeOf(value) !== schema.type && !isInteger(schema.type, value)) {
    return [...problems, `${here}: expected ${schema.type}, found ${typeOf(value)}`];
  }
  if ('const' in schema && value !== schema.const) problems.push(`${here}: expected ${JSON.stringify(schema.const)}`);
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) problems.push(`${here}: not one of the enum`);
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((sub) => nested(sub, value, at).length === 0)) {
    problems.push(`${here}: matches none of anyOf`);
  }
  if (typeof value === 'string') problems.push(...stringProblems(schema, value, here));
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      problems.push(`${here}: fewer than ${schema.minItems} items`);
    }
    if (schema.items !== undefined) {
      for (const [i, item] of value.entries()) problems.push(...nested(schema.items, item, `${at}/${i}`));
    }
  }
  if (typeOf(value) === 'object') problems.push(...objectProblems(schema, value as Schema, nested, at));
  return problems;
}

function objectProblems(
  schema: Schema,
  value: Schema,
  nested: (sub: unknown, child: unknown, path: string) => string[],
  at: string,
): string[] {
  const problems: string[] = [];
  const properties = (schema.properties ?? {}) as Schema;
  for (const name of (schema.required ?? []) as string[]) {
    if (!(name in value)) problems.push(`${at || '/'}: missing ${name}`);
  }
  for (const [name, child] of Object.entries(value)) {
    const path = `${at}/${name}`;
    if (name in properties) problems.push(...nested(properties[name], child, path));
    else if (schema.additionalProperties === false) problems.push(`${path}: not allowed`);
    else if (typeof schema.additionalProperties === 'object') {
      problems.push(...nested(schema.additionalProperties, child, path));
    }
  }
  return problems;
}

function stringProblems(schema: Schema, value: string, here: string): string[] {
  const problems: string[] = [];
  if (typeof schema.minLength === 'number' && value.length < schema.minLength) problems.push(`${here}: too short`);
  if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
    problems.push(`${here}: does not match ${schema.pattern}`);
  }
  return problems;
}

function resolve(root: Schema, ref: string): Schema {
  const name = /^#\/\$defs\/(.+)$/.exec(ref)?.[1];
  const found = name === undefined ? undefined : ((root.$defs ?? {}) as Schema)[name];
  if (found === undefined) throw new Error(`validateJson cannot resolve ${ref}`);
  return found as Schema;
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isInteger(type: string, value: unknown): boolean {
  return type === 'integer' && Number.isInteger(value);
}
