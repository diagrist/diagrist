import { type Diagnostic, diagnostic } from '../diagnostic.js';
import type { KindSpec } from '../grammar/spec.js';
import { nearest } from '../grammar/suggest.js';
import { list } from '../list.js';
import { LANG_CODES } from '../messages.js';
import type { Statement } from '../tree.js';
import { dropLine } from './drop.js';
import { declaredId, sameTree, startsWith } from './lines.js';
import { setLine } from './set.js';

/** One line of a picture while a variant is merged into it. */
export interface Slot {
  readonly statement: Statement;
  readonly origin: 'base' | 'added' | 'changed';
  /** The line as the picture it builds on had it, for a line that was changed. */
  readonly before?: Statement;
  /** The `drop` that removed it; a line declared again with what the drop names takes its place. */
  readonly dropped?: Statement;
  /** For a line declared again: where the variant wrote it, so new lines written before it go before it. */
  readonly written?: number;
}

/** A variant merged into the picture it builds on: every line, the removed ones still in place, and what was wrong. */
export interface Merge {
  readonly slots: Slot[];
  readonly diagnostics: Diagnostic[];
}

interface Added {
  statement: Statement;
  readonly written: number;
}

/**
 * Merges the lines of a variant into the picture it builds on (ADR 0021). `set` changes a line where it stands; a
 * line declared again after its `drop` takes the dropped line's place. A new line goes before the next line of its
 * keyword the variant declares again, else after the last line of its keyword, removed ones included, else to the end.
 */
export function mergeVariant(kind: KindSpec, parent: readonly Slot[], variant: Statement, id: string): Merge {
  const slots: Slot[] = parent.map((slot) => ({ statement: slot.statement, origin: 'base' }));
  const added: Added[] = [];
  const diagnostics: Diagnostic[] = [];
  const keywords = kind.statements.map((s) => s.keyword);
  variant.children.forEach((line, written) => {
    if (line.keyword === 'set') setLine(kind, line, slots, added, diagnostics);
    else if (line.keyword === 'drop') dropLine(line, id, slots, added, diagnostics);
    else if (keywords.includes(line.keyword)) declare(kind, line, written, slots, added, diagnostics);
    else {
      const allowed = [...keywords, 'set', 'drop'];
      const values = { found: line.keyword, allowed: list(allowed), suggestion: nearest(line.keyword, allowed) ?? '' };
      diagnostics.push(diagnostic(LANG_CODES.unknownKeyword, 'error', line.keywordSpan, values));
    }
  });
  for (const entry of variant.entries) {
    const values = { statement: 'variant', allowed: list([...keywords, 'set', 'drop']) };
    diagnostics.push(diagnostic(LANG_CODES.noLinesHere, 'error', entry.textSpan, values));
  }
  for (const line of added) place(slots, line);
  return { slots, diagnostics };
}

function declare(
  kind: KindSpec,
  line: Statement,
  written: number,
  slots: Slot[],
  added: Added[],
  diagnostics: Diagnostic[],
): void {
  const id = declaredId(kind, line);
  const again = slots.findIndex(
    (s) =>
      s.dropped !== undefined &&
      (startsWith(line, s.statement.keyword, s.dropped.arguments.slice(1)) ||
        (id !== undefined && declaredId(kind, s.statement) === id)),
  );
  const old = slots[again];
  if (old !== undefined) {
    const origin = sameTree(old.statement, line) ? 'base' : 'changed';
    slots[again] = { statement: line, origin, before: old.statement, written };
    return;
  }
  const present = [
    ...slots.filter((s) => s.dropped === undefined).map((s) => s.statement),
    ...added.map((a) => a.statement),
  ];
  const first = id === undefined ? undefined : present.find((s) => declaredId(kind, s) === id);
  if (first !== undefined) {
    const values = { found: id ?? '', first: String(first.line), keyword: first.keyword };
    diagnostics.push(diagnostic(LANG_CODES.redeclared, 'error', line.arguments[0]?.span ?? line.keywordSpan, values));
    return;
  }
  added.push({ statement: line, written });
}

function place(slots: Slot[], line: Added): void {
  const keyword = line.statement.keyword;
  const slot: Slot = { statement: line.statement, origin: 'added' };
  const anchors = slots
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => s.written !== undefined && s.written > line.written && s.statement.keyword === keyword)
    .sort((a, b) => (a.s.written ?? 0) - (b.s.written ?? 0));
  const before = anchors[0];
  if (before !== undefined) {
    slots.splice(before.index, 0, slot);
    return;
  }
  const last = slots.findLastIndex((s) => s.statement.keyword === keyword);
  slots.splice(last < 0 ? slots.length : last + 1, 0, slot);
}
