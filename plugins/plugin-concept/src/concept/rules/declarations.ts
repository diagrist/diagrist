import type { Finding } from '@diagrist/core';
import { list, nearest } from '@diagrist/lang';
import type { ConceptRule } from './shared.js';

export const unknownType: ConceptRule = {
  code: 'M110',
  severity: 'error',
  doc: 'An item names its type with `is`, and the type is declared with `type`, by the vocabulary file of `use=` or by the vocabulary of `vocabulary=`.',
  check: (m) => {
    const types = [...m.types.keys()];
    return m.items.flatMap((item): Finding[] => {
      if (m.types.has(item.type)) return [];
      const base = { item: item.id, types: types.length > 0 ? list(types) : '' };
      if (item.type === '') return [{ span: item.span, values: { ...base, case: 'none', type: '' } }];
      return [
        {
          span: item.span,
          values: { ...base, case: 'unknown', type: item.type, nearest: nearest(item.type, types) ?? '' },
        },
      ];
    });
  },
};

export const unknownLink: ConceptRule = {
  code: 'M111',
  severity: 'error',
  doc: 'A relation names a link declared with `link`, by the vocabulary file of `use=` or by the vocabulary of `vocabulary=`.',
  check: (m) => {
    const links = [...m.links.keys()];
    return m.relations
      .filter((r) => !m.links.has(r.link))
      .map((r) => ({
        span: r.span,
        values: { link: r.link, links: links.length > 0 ? list(links) : '', nearest: nearest(r.link, links) ?? '' },
      }));
  },
};

export const repeated: ConceptRule = {
  code: 'M113',
  severity: 'error',
  doc: 'The file adds types and links to its vocabulary, but does not declare one of the vocabulary again.',
  check: (m) => m.repeated.map((r) => ({ span: r.span, values: { case: r.what, id: r.id, vocabulary: r.by } })),
};

export const usedProblem: ConceptRule = {
  code: 'M120',
  severity: 'error',
  doc: 'The vocabulary file of `use=` reads without errors, since a picture cannot build on declarations that are broken.',
  check: (m) => {
    const used = m.used;
    if (used?.problem === undefined) return [];
    return [
      {
        span: used.span,
        values: { path: used.path, code: used.problem.code, line: String(used.problem.span.line) },
      },
    ];
  },
};
