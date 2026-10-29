import type { Locale } from '@diagrist/lang';
import type { ConceptModel } from './model.js';
import { CONCEPT_WORDS } from './texts/index.js';

/**
 * The picture in sentences: what it is, the items of each type, the entries of the items that have some, and one
 * sentence per relation from the label of its link, such as "Stationsteam führt aus: Schaden prüfen".
 */
export function describeConcept(m: ConceptModel, locale: Locale): string {
  const w = CONCEPT_WORDS[locale];
  const label = new Map(m.items.map((i) => [i.id, i.label]));
  const used = [...m.types.values()].filter((t) => m.items.some((i) => i.type === t.id));
  return [
    w.diagram(m.title, m.items.length, used.length),
    ...used.map((t) =>
      w.type(
        t.label[locale],
        m.items.filter((i) => i.type === t.id).map((i) => i.label),
      ),
    ),
    ...m.items.filter((i) => i.entries.length > 0).map((i) => w.entries(i.label, i.entries)),
    ...m.relations.flatMap((r) => {
      const link = m.links.get(r.link);
      const from = label.get(r.from);
      const to = label.get(r.to);
      return link && from && to ? [w.relation(from, link.label[locale], to, r.label)] : [];
    }),
  ].join(' ');
}
