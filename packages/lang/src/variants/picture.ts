import type { Diagnostic } from '../diagnostic.js';
import { type ReadOptions, readKind } from '../grammar/read-kind.js';
import type { Infer, KindSpec, StatementSpec } from '../grammar/spec.js';
import type { Statement } from '../tree.js';
import { changedBlock, declaredId, tagged } from './lines.js';
import type { Slot } from './merge.js';
import type { Picture } from './unfold.js';

/**
 * The picture of a variant: the header with the variant's title and subtitle and its lines, read against the kind's
 * tables. A reference to a line the variant dropped is L114. Only with `diff` do the lines carry their origin, and
 * the removed ones stay in, tagged `removed`, so the kind draws the comparison; the findings are those of the
 * picture without them. Without `diff` the picture reads exactly like a file written out by hand.
 */
export function pictureOf<S extends readonly StatementSpec[]>(
  kind: KindSpec<S>,
  header: Statement,
  variant: Statement,
  id: string,
  slots: readonly Slot[],
  files: Pick<ReadOptions, 'path' | 'files'>,
): Picture<Infer<S[number]>> {
  const head = headerOf(header, variant);
  const kept = slots.filter((s) => s.dropped === undefined);
  const keptIds = new Set(kept.map((s) => declaredId(kind, s.statement)));
  const dropped = new Map(
    slots
      .filter((s) => s.dropped !== undefined)
      .flatMap((s) => declaredId(kind, s.statement) ?? [])
      .filter((dropId) => !keptIds.has(dropId))
      .map((dropId) => [dropId, id]),
  );
  const plain = readKind(
    kind,
    { statements: [head, ...kept.map((s) => tagged(s.statement, 'base'))], trailingComments: [] },
    { ...files, dropped },
  );
  const diff = variant.arguments.slice(2).find((t) => t.kind === 'word' && t.value === 'diff')?.span;
  if (diff === undefined) return { variant: id, reading: plain };
  const drawn = readKind(kind, { statements: [head, ...slots.map(lineOf)], trailingComments: [] }, files);
  const seen = new Set(plain.diagnostics.map(keyOf));
  const diagnostics = [...plain.diagnostics, ...drawn.diagnostics.filter((d) => !seen.has(keyOf(d)))];
  return { variant: id, diff, reading: { ...drawn, diagnostics } };
}

const keyOf = (d: Diagnostic): string => JSON.stringify([d.code, d.span, d.values]);

function lineOf(slot: Slot): Statement {
  if (slot.dropped !== undefined) return tagged(slot.statement, 'removed');
  if (slot.origin === 'changed' && slot.before !== undefined) return changedBlock(slot.before, slot.statement);
  return tagged(slot.statement, slot.origin);
}

/** The header of the file with the title of the variant and, when it sets one, its subtitle. */
function headerOf(header: Statement, variant: Statement): Statement {
  const [name, , ...rest] = header.arguments;
  const title = variant.arguments[1];
  if (name === undefined || title === undefined) return header;
  const subtitle = variant.attributes.find((a) => a.key === 'subtitle');
  const attributes = subtitle === undefined ? header.attributes : withAttribute(header, subtitle);
  return { ...header, arguments: [name, title, ...rest], attributes };
}

function withAttribute(header: Statement, attribute: Statement['attributes'][number]): Statement['attributes'] {
  const at = header.attributes.findIndex((a) => a.key === attribute.key);
  return at < 0 ? [...header.attributes, attribute] : header.attributes.map((a, i) => (i === at ? attribute : a));
}
