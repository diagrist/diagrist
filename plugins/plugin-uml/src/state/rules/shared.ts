import type { Rule } from '@diagrist/core';
import type { Severity } from '@diagrist/lang';
import type { Transition } from '../diagram.js';
import type { StateModel } from '../model.js';

/** A rule of the state kind. */
export type StateRule = Rule<StateModel>;

/** Declares a rule; `check` returns findings, the code and severity are written once here. */
export const defineRule = (
  code: string,
  severity: Severity,
  doc: string,
  check: (model: StateModel) => ReturnType<StateRule['check']>,
): StateRule => ({ code, severity, doc, check });

/**
 * A vertex for the texts of findings: its kind and its name or id. The catalogue phrases it, so findings carry data.
 */
export function vertexValues(m: StateModel, id: string, prefix = ''): Record<string, string> {
  const v = m.vertices.get(id);
  return { [`${prefix}kind`]: v?.kind ?? 'state', [`${prefix}name`]: v?.label ?? id };
}

/** The transition as written, such as `go a -> b`. */
export const transitionText = (t: Transition): string => `go ${t.from} -> ${t.to}`;
