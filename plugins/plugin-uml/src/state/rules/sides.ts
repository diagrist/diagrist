import type { Finding } from '@diagrist/core';
import { firstOfSide } from '../model.js';
import { defineRule, transitionText } from './shared.js';

/** The sides across each direction of the flow, as the message suggests them. */
const ACROSS = { down: ['left', 'right'], right: ['above', 'below'] } as const;

export const sideAlongFlow = defineRule(
  'U962',
  'warning',
  '`side=` puts the target beside the source, across the flow: `left` or `right` in a flow down, `above` or `below` with `direction=right`. A side along the flow has no effect (ADR 0040).',
  (m) =>
    m.diagram.transitions.flatMap((t): Finding[] =>
      t.side === undefined || firstOfSide(t, m.diagram.direction) !== undefined
        ? []
        : [
            {
              span: t.span,
              values: {
                transition: transitionText(t),
                side: t.side,
                direction: m.diagram.direction,
                one: ACROSS[m.diagram.direction][0],
                other: ACROSS[m.diagram.direction][1],
              },
            },
          ],
    ),
);
