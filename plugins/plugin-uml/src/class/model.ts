import type { ClassDiagram, Classifier, NaryAssociation, Package } from './diagram.js';

/** The diagram with its elements by id, which rules, layout and description look up. */
export interface ClassModel {
  readonly diagram: ClassDiagram;
  readonly classifiers: ReadonlyMap<string, Classifier>;
  readonly packages: ReadonlyMap<string, Package>;
  readonly associations: ReadonlyMap<string, NaryAssociation>;
}

const byId = <T extends { readonly id: string }>(items: readonly T[]): Map<string, T> => {
  const out = new Map<string, T>();
  for (const item of items) if (!out.has(item.id)) out.set(item.id, item);
  return out;
};

/** The model of a class diagram; the first declaration of an id wins (a second one is L108). */
export function classModel(diagram: ClassDiagram): ClassModel {
  return {
    diagram,
    classifiers: byId(diagram.classifiers),
    packages: byId(diagram.packages),
    associations: byId(diagram.associations),
  };
}

/** The packages around `id`, innermost first: its own package and their parents; cycles end the chain. */
export function packagesAround(m: ClassModel, id: string): string[] {
  const out: string[] = [];
  let next = m.classifiers.get(id)?.package ?? m.associations.get(id)?.package ?? m.packages.get(id)?.parent;
  while (next !== undefined && m.packages.has(next) && !out.includes(next) && next !== id) {
    out.push(next);
    next = m.packages.get(next)?.parent;
  }
  return out;
}
