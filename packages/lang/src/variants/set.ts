import { type Diagnostic, diagnostic } from '../diagnostic.js';
import { argumentEnd, type LineContext, readLine } from '../grammar/read-line.js';
import type { KindSpec, LineSpec } from '../grammar/spec.js';
import { list } from '../list.js';
import { LANG_CODES } from '../messages.js';
import { scan } from '../scanner.js';
import type { Argument, Statement } from '../tree.js';
import { declaredId } from './lines.js';
import type { Slot } from './merge.js';
import { SET } from './tables.js';

/**
 * Applies `set <id> ...`: what follows the id is read against the table of the line that declares `id` (L107 when
 * none does, L115 when nothing follows), then laid over that line where it stands.
 */
export function setLine(
  kind: KindSpec,
  line: Statement,
  slots: Slot[],
  added: { statement: Statement }[],
  diagnostics: Diagnostic[],
): void {
  const [target, ...tail] = line.arguments;
  if (target?.kind !== 'word') {
    const values = { statement: 'set', name: 'id', expected: 'the id of a line', example: SET.examples[0] ?? 'set' };
    diagnostics.push(diagnostic(LANG_CODES.missingArgument, 'error', line.keywordSpan, values));
    return;
  }
  const kept = slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.dropped === undefined);
  const lines = [...kept.map(({ slot }) => slot.statement), ...added.map((a) => a.statement)];
  const found = lines.find((s) => declaredId(kind, s) === target.value);
  const spec = kind.statements.find((s) => s.keyword === found?.keyword);
  if (found === undefined || spec === undefined) {
    const known = list(lines.flatMap((s) => declaredId(kind, s) ?? []).slice(0, 20));
    const expected = 'the id a line at the top level of the picture declares';
    const values = { name: 'id', found: target.value, expected, known };
    diagnostics.push(diagnostic(LANG_CODES.unknownReference, 'error', target.span, values));
    return;
  }
  if (tail.length === 0 && line.attributes.length === 0) {
    const values = { id: target.value, keyword: spec.keyword, allowed: allowedOf(spec), example: exampleOf(spec) };
    diagnostics.push(diagnostic(LANG_CODES.emptySet, 'error', target.span, values));
    return;
  }
  const context: LineContext = { diagnostics: [], references: [], declarations: [] };
  const input = { label: spec.keyword, keyword: spec.keyword, start: line.keywordSpan, line: line.line };
  readLine({ ...spec, arguments: [] }, { ...input, tokens: tail, attributes: line.attributes }, context);
  if (context.diagnostics.length > 0) {
    diagnostics.push(...context.diagnostics);
    return;
  }
  const patched = patch(found, spec, tail, line);
  const own = added.find((a) => a.statement === found);
  if (own !== undefined) {
    own.statement = patched;
    return;
  }
  const at = kept.find(({ slot }) => slot.statement === found);
  if (at === undefined) return;
  slots[at.index] = { ...at.slot, statement: patched, origin: 'changed', before: at.slot.before ?? at.slot.statement };
}

/** The line with the flags, clauses and attributes of a `set` laid over it: written ones replace, new ones follow. */
function patch(target: Statement, spec: LineSpec, tail: readonly Argument[], set: Statement): Statement {
  const end = argumentEnd(spec, target.arguments);
  const rest = [...target.arguments.slice(end)];
  for (let i = 0; i < tail.length; i++) {
    const token = tail[i] as Argument;
    const value = tail[i + 1];
    if (token.kind === 'word' && token.value in spec.clauses && value !== undefined) {
      const at = rest.findIndex((t, j) => t.kind === 'word' && t.value === token.value && j + 1 < rest.length);
      if (at >= 0) rest[at + 1] = value;
      else rest.push(token, value);
      i++;
    } else if (!rest.some((t) => t.kind === token.kind && t.value === token.value)) rest.push(token);
  }
  const attributes = [...target.attributes];
  for (const attribute of set.attributes) {
    const at = attributes.findIndex((a) => a.key === attribute.key);
    if (at >= 0) attributes[at] = attribute;
    else attributes.push(attribute);
  }
  return { ...target, arguments: [...target.arguments.slice(0, end), ...rest], attributes };
}

function allowedOf(spec: LineSpec): string {
  return list([
    ...Object.keys(spec.flags),
    ...Object.keys(spec.clauses).map((c) => `${c} <value>`),
    ...Object.keys(spec.attributes).map((a) => `${a}=`),
  ]);
}

/** A change as the table's own example writes it: its first attribute, else its first flag. */
function exampleOf(spec: LineSpec): string {
  const tokens = scan(spec.examples[0] ?? '').lines[0]?.tokens ?? [];
  const attribute = tokens.find((t) => t.kind === 'attribute');
  if (attribute?.kind === 'attribute')
    return `${attribute.key}=${attribute.quoted ? `"${attribute.value}"` : attribute.value}`;
  return Object.keys(spec.flags)[0] ?? '';
}
