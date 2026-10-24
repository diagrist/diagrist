import type { Finding, Rule } from '@diagrist/core';
import type { Severity } from '@diagrist/lang';
import { FOUND, GATE, LOST, type SequenceEvent } from '../diagram.js';
import type { SequenceModel } from '../model/types.js';

/** A rule of the sequence kind. */
export type SequenceRule = Rule<SequenceModel>;

/** Declares a rule; `check` returns findings, the code and severity are written once here. */
export const defineRule = (
  code: string,
  severity: Severity,
  doc: string,
  check: (model: SequenceModel) => readonly Finding[],
): SequenceRule => ({ code, severity, doc, check });

/** Findings the model made while it was built, under the code of the rule that reports them. */
export const issues = (model: SequenceModel, code: string): Finding[] =>
  model.issues.filter((i) => i.code === code).map(({ span, values }) => ({ span, values }));

/** `gate` and `gate.name`: a gate on the frame `sd` of the interaction. */
export const isFrameGate = (id: string): boolean => id === GATE || id.startsWith(`${GATE}.`);

/** Lifelines an event names; `gates` are message ends on frames (`gate.name`, references, fragments). */
export function referencedLifelines(e: SequenceEvent, gates: ReadonlySet<string> = new Set()): readonly string[] {
  switch (e.type) {
    case 'message':
      return [...new Set([e.from, e.to])].filter((id) => id !== FOUND && id !== LOST && id !== GATE && !gates.has(id));
    case 'destroy':
    case 'activate':
    case 'deactivate':
      return [e.target];
    case 'ref':
    case 'note':
      return e.over;
    case 'invariant':
    case 'coregion':
      return e.on ? [e.on] : [];
    default:
      return [];
  }
}

/** Messages with `id`: name to event index; the first one wins. */
export function messageIds(events: readonly SequenceEvent[]): Map<string, number> {
  const out = new Map<string, number>();
  events.forEach((e, i) => {
    if (e.type === 'message' && e.id && !out.has(e.id)) out.set(e.id, i);
  });
  return out;
}

/** A list of names for a message, such as `` `a`, `b` ``. */
export const names = (ids: readonly string[]): string => ids.map((id) => `\`${id}\``).join(', ') || 'none';
