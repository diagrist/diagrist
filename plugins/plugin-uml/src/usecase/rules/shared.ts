import type { Finding, Rule } from '@diagrist/core';
import type { Severity } from '@diagrist/lang';
import type { Relation } from '../diagram.js';
import type { UseCaseModel } from '../model.js';

/** A rule of the use case kind. */
export type UseCaseRule = Rule<UseCaseModel>;

/** Declares a rule; `check` returns findings, the code and severity are written once here. */
export const defineRule = (
  code: string,
  severity: Severity,
  doc: string,
  check: (model: UseCaseModel) => readonly Finding[],
): UseCaseRule => ({ code, severity, doc, check });

/** The relation as written, such as `a --> b include`, for the texts of findings. */
export const relationText = (r: Relation): string => [r.from, r.arrow, r.to, ...r.flagged].join(' ');

/** First edge of every cycle over the given relations, by a depth-first search in source order. */
export function cycles(relations: readonly Relation[]): Relation[] {
  const state = new Map<string, 'open' | 'done'>();
  const found: Relation[] = [];
  const visit = (id: string): void => {
    state.set(id, 'open');
    for (const r of relations.filter((g) => g.from === id)) {
      if (state.get(r.to) === 'open') found.push(r);
      else if (!state.has(r.to)) visit(r.to);
    }
    state.set(id, 'done');
  };
  for (const r of relations) if (!state.has(r.from)) visit(r.from);
  return found;
}

/** What an id names: an actor, a use case, or neither (the language reported it already). */
export function endKind(id: string, m: UseCaseModel): 'actor' | 'usecase' | 'unknown' {
  if (m.actors.has(id)) return 'actor';
  return m.cases.has(id) ? 'usecase' : 'unknown';
}
