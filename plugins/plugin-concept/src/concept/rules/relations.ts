import type { Finding } from '@diagrist/core';
import { list } from '@diagrist/lang';
import { counts, type End } from '../../shared/declarations.js';
import type { ConceptModel } from '../model.js';
import { type ConceptRule, itemsById, known } from './shared.js';

export const wrongTypes: ConceptRule = {
  code: 'M114',
  severity: 'error',
  doc: 'A relation joins items of the types its link lists in `from=` and `to=`.',
  check: (m) => {
    const items = itemsById(m);
    return known(m).flatMap((r) => {
      const link = m.links.get(r.link);
      if (link === undefined) return [];
      return (['from', 'to'] as const).flatMap((side): Finding[] => {
        const item = items.get(r[side]);
        if (item === undefined || !m.types.has(item.type) || link[side].includes(item.type)) return [];
        return [
          {
            span: r.span,
            values: { link: r.link, side, item: item.id, type: item.type, allowed: list([...link[side]]) },
          },
        ];
      });
    });
  },
};

/** How many relations of `link` each item has at `side`. */
function tally(m: ConceptModel, link: string, side: 'from' | 'to'): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of known(m).filter((x) => x.link === link)) out.set(r[side], (out.get(r[side]) ?? 0) + 1);
  return out;
}

/** Findings for items at the sides a count of a link applies to, whose number of relations `fails`. */
function countRule(code: string, which: 'each' | 'single', fails: (n: number) => boolean, doc: string): ConceptRule {
  return {
    code,
    severity: 'error',
    doc,
    check: (m) =>
      [...m.links.values()].flatMap((link) => {
        const end: End | undefined = link[which];
        return (['from', 'to'] as const)
          .filter((side) => counts(end, side))
          .flatMap((side) => {
            const n = tally(m, link.id, side);
            return m.items
              .filter((item) => link[side].includes(item.type) && fails(n.get(item.id) ?? 0))
              .map((item) => ({
                span: item.span,
                values: { item: item.id, type: item.type, link: link.id, side, count: String(n.get(item.id) ?? 0) },
              }));
          });
      }),
  };
}

export const eachMissing = countRule(
  'M115',
  'each',
  (n) => n === 0,
  'Every item of the types a link counts with `each=` has at least one relation of that link.',
);

export const singleBroken = countRule(
  'M116',
  'single',
  (n) => n > 1,
  'Every item of the types a link counts with `single=` has at most one relation of that link.',
);

/** The first cycle through relations of `link`, as the items along it, or none. */
function cycleOf(m: ConceptModel, link: string): string[] | undefined {
  const next = new Map<string, string[]>();
  for (const r of known(m).filter((x) => x.link === link && x.from !== x.to))
    next.set(r.from, [...(next.get(r.from) ?? []), r.to]);
  const state = new Map<string, 'open' | 'done'>();
  const path: string[] = [];
  const visit = (id: string): string[] | undefined => {
    state.set(id, 'open');
    path.push(id);
    for (const to of next.get(id) ?? []) {
      if (state.get(to) === 'open') return [...path.slice(path.indexOf(to)), to];
      const found = state.has(to) ? undefined : visit(to);
      if (found) return found;
    }
    path.pop();
    state.set(id, 'done');
    return undefined;
  };
  for (const item of m.items) {
    const found = state.has(item.id) ? undefined : visit(item.id);
    if (found) return found;
  }
  return undefined;
}

export const cycle: ConceptRule = {
  code: 'M117',
  severity: 'error',
  doc: 'Relations of an `acyclic` link never lead back to where they started, such as a term that is a kind of itself.',
  check: (m) =>
    [...m.links.values()]
      .filter((l) => l.acyclic)
      .flatMap((link) => {
        const found = cycleOf(m, link.id);
        const first = found && known(m).find((r) => r.link === link.id && r.from === found[0] && r.to === found[1]);
        return found && first ? [{ span: first.span, values: { link: link.id, items: found.join(' → ') } }] : [];
      }),
};

export const itself: ConceptRule = {
  code: 'M118',
  severity: 'error',
  doc: 'A relation joins two different items; a role that stands in for itself or a term that is part of itself says nothing.',
  check: (m) =>
    m.relations.filter((r) => r.from === r.to).map((r) => ({ span: r.span, values: { item: r.from, link: r.link } })),
};

export const unexplained: ConceptRule = {
  code: 'M119',
  severity: 'error',
  doc: 'Every item of an `explain` type has at least one indented entry, such as the definition of a term.',
  check: (m) =>
    m.items
      .filter((item) => m.types.get(item.type)?.explain === true && item.entries.length === 0)
      .map((item) => ({ span: item.span, values: { item: item.id, type: item.type } })),
};
