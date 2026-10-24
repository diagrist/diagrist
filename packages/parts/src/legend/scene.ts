import type { Shape } from '@diagrist/core';
import type { Legend, LegendEntry } from './layout.js';

/**
 * The separator and one group per entry: the sample the plugin draws, then the entry's text. Roles `legendRule`,
 * `legend` and `legendText` are styled by `PART_ROLES`.
 */
export function legendShapes<S>(legend: Legend<S>, sample: (entry: LegendEntry<S>) => readonly Shape[]): Shape[] {
  return [
    { kind: 'line', ...legend.separator, role: 'legendRule' },
    ...legend.entries.map(
      (entry): Shape => ({
        kind: 'group',
        role: 'legend',
        children: [
          ...sample(entry),
          { kind: 'text', ...entry.textAt, text: entry.text, role: 'legendText', font: 'note' },
        ],
      }),
    ),
  ];
}
