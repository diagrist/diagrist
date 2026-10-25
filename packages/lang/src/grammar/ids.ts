import { list } from '../list.js';
import { LANG_CODES } from '../messages.js';
import { type LineContext, report } from './read-line.js';

/**
 * Checks the ids of a reading once every line is read: each is declared once (L108), and each reference points to a
 * declared id of the right keyword (L107), or is L114 when a variant dropped the id it points to.
 */
export function checkIds(context: LineContext, dropped: ReadonlyMap<string, string>): void {
  const first = new Map<string, number>();
  for (const declaration of context.declarations) {
    const line = first.get(declaration.id);
    if (line === undefined) first.set(declaration.id, declaration.line);
    else report(context, LANG_CODES.duplicateId, declaration.span, { found: declaration.id, first: String(line) });
  }
  for (const reference of context.references) {
    const targets = reference.value.refersTo ?? [];
    const known = context.declarations.filter((d) => targets.includes(d.keyword)).map((d) => d.id);
    const variant = dropped.get(reference.found);
    if (!known.includes(reference.found) && variant !== undefined) {
      report(context, LANG_CODES.droppedReference, reference.span, {
        id: reference.found,
        variant,
        name: reference.name,
      });
    } else if (!known.includes(reference.found)) {
      report(context, LANG_CODES.unknownReference, reference.span, {
        name: reference.name,
        found: reference.found,
        expected: reference.value.expected,
        known: list(known.slice(0, 20)),
      });
    }
  }
}
