import type { Actor, Subject, UseCase, UseCaseDiagram } from './diagram.js';

/** The diagram with its elements by id, which rules, layout and description look up. */
export interface UseCaseModel {
  readonly diagram: UseCaseDiagram;
  readonly actors: ReadonlyMap<string, Actor>;
  readonly cases: ReadonlyMap<string, UseCase>;
  readonly subjects: ReadonlyMap<string, Subject>;
}

const byId = <T extends { readonly id: string }>(items: readonly T[]): Map<string, T> => {
  const out = new Map<string, T>();
  for (const item of items) if (!out.has(item.id)) out.set(item.id, item);
  return out;
};

/** The model of a use case diagram; the first declaration of an id wins (a second one is L108). */
export function useCaseModel(diagram: UseCaseDiagram): UseCaseModel {
  return {
    diagram,
    actors: byId(diagram.actors),
    cases: byId(diagram.cases),
    subjects: byId(diagram.subjects),
  };
}
