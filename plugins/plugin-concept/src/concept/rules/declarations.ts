import type { Finding } from '@diagrist/core';
import { list, nearest } from '@diagrist/lang';
import type { ConceptRule } from './shared.js';

export const unknownType: ConceptRule = {
  code: 'M110',
  severity: 'error',
  doc: 'An item names its type with `is`, and the type is declared with `type` or by the vocabulary of the header.',
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
  doc: 'A relation names a link declared with `link` or by the vocabulary of the header.',
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

export const linkTypes: ConceptRule = {
  code: 'M112',
  severity: 'error',
  doc: 'A link lists the types it joins with `from=` and `to=`, each a declared type.',
  check: (m) =>
    [...m.links.values()].flatMap((link): Finding[] => {
      if (!('file' in link.origin)) return [];
      const span = link.origin.file;
      return (['from', 'to'] as const).flatMap((side): Finding[] => {
        const names = link[side];
        if (names.length === 0) return [{ span, values: { link: link.id, side, case: 'none', type: '' } }];
        return names
          .filter((t) => !m.types.has(t))
          .map((t) => ({ span, values: { link: link.id, side, case: 'unknown', type: t } }));
      });
    }),
};

export const repeated: ConceptRule = {
  code: 'M113',
  severity: 'error',
  doc: 'The file adds types and links to its vocabulary, but does not declare one of the vocabulary again.',
  check: (m) =>
    m.repeated.map((r) => ({ span: r.span, values: { case: r.what, id: r.id, vocabulary: m.vocabulary ?? '' } })),
};
