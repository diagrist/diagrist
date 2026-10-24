import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { INTERACTIONS } from '../../spec/interactions.js';
import type { SequenceEvent } from '../diagram.js';
import { defineRule } from './shared.js';

export const afterOperand = implementing(
  { uml: [INTERACTIONS.interactionOperand] },
  defineRule(
    'U401',
    'error',
    'Inside a fragment, the statements of an operand are indented below its `else` or `and`. A statement at the level of the marker after it would silently join the operand above.',
    (m) => m.diagram.afterOperands.map(({ span, fragment, operand }) => ({ span, values: { fragment, operand } })),
  ),
);

export const unlistedMessages = implementing(
  { uml: [INTERACTIONS.ignore, INTERACTIONS.consider] },
  defineRule(
    'U451',
    'error',
    '`ignore` and `consider` name the messages they ignore or consider, written as their guard.',
    (m) =>
      m.diagram.events.flatMap((e): Finding[] =>
        e.type === 'fragment' && (e.operator === 'ignore' || e.operator === 'consider') && !e.guard?.trim()
          ? [{ span: e.span, values: { operator: e.operator } }]
          : [],
      ),
  ),
);

/** Whether a statement may stand in a coregion on `on`; only messages from or to it can be unordered there. */
const outsideCoregion = (e: SequenceEvent, on: string): boolean => e.type === 'message' && e.from !== on && e.to !== on;

export const coregionContent = implementing(
  { uml: [INTERACTIONS.coregion] },
  defineRule(
    'U453',
    'error',
    'A coregion is the short form of a `par` whose operands hold one event each on the same lifeline; every message in it is sent or received by that lifeline. The tables allow only `msg`, `activate`, `deactivate` and `note` in it.',
    (m) =>
      m.coregions.flatMap((k) =>
        m.diagram.events
          .slice(k.index + 1, k.end ?? m.diagram.events.length)
          .filter((e) => outsideCoregion(e, k.on))
          .map((e) => ({ span: e.span, values: { on: k.on } })),
      ),
  ),
);

export const singleOperand = implementing(
  { uml: [INTERACTIONS.alternatives, INTERACTIONS.parallel] },
  defineRule(
    'U900',
    'warning',
    'UML allows `alt` and `par` with one operand, but `opt` or no fragment says it more clearly.',
    (m) =>
      m.fragments
        .filter((f) => (f.event.operator === 'alt' || f.event.operator === 'par') && f.operands.length < 2)
        .map((f) => ({ span: f.event.span, values: { operator: f.event.operator } })),
  ),
);

export const emptyOperand = implementing(
  { uml: [INTERACTIONS.interactionOperand] },
  defineRule('U903', 'warning', 'An operand without events draws an empty band; fill it or remove it.', (m) =>
    m.fragments.flatMap((f) =>
      f.operands
        .filter((o) => o.items.length === 0)
        .map((o) => ({
          span: m.diagram.events[o.index]?.span ?? f.event.span,
          values: { operator: f.event.operator, guard: o.guard ?? '' },
        })),
    ),
  ),
);

export const missingGuard = implementing(
  { uml: [INTERACTIONS.alternatives, INTERACTIONS.guard] },
  defineRule(
    'U904',
    'warning',
    'In `alt` every operand but the last needs a guard; the last one may stand for `[else]`.',
    (m) =>
      m.fragments
        .filter((f) => f.event.operator === 'alt')
        .flatMap((f) =>
          f.operands
            .slice(0, -1)
            .filter((o) => !o.guard)
            .map((o) => ({ span: m.diagram.events[o.index]?.span ?? f.event.span })),
        ),
  ),
);

export const thinCoregion = implementing(
  { uml: [INTERACTIONS.coregion] },
  defineRule('U909', 'warning', 'A coregion with fewer than two messages leaves no order open and says nothing.', (m) =>
    m.coregions.flatMap((k) => {
      const count = m.diagram.events
        .slice(k.index + 1, k.end ?? m.diagram.events.length)
        .filter((e) => e.type === 'message').length;
      return count < 2 ? [{ span: k.span, values: { on: k.on, count: String(count) } }] : [];
    }),
  ),
);
