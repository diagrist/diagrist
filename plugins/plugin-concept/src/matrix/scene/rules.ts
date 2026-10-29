import type { Shape } from '@diagrist/core';
import type { PlacedSide, TableLayout } from '@diagrist/layout-matrix';

/** The entries down the side cut into runs of lines, so the rules between columns stop at every band. */
function runs(side: readonly PlacedSide[]): PlacedSide[][] {
  const out: PlacedSide[][] = [];
  side.forEach((s, i) => {
    if (s.kind === 'band') return;
    if (side[i - 1]?.kind === 'line') out.at(-1)?.push(s);
    else out.push([s]);
  });
  return out;
}

/**
 * The rules of the table: hairlines between the entries across the whole width, hairlines between the columns
 * through each run of lines but not through a band, and a dark rule below the heads across the top.
 */
export function tableRules(table: TableLayout): Shape[] {
  const { frame, body, side, top } = table;
  const right = frame.x + frame.w;
  const across = side
    .slice(1)
    .map((s): Shape => ({ kind: 'line', x1: frame.x, y1: s.rect.y, x2: right, y2: s.rect.y, role: 'tableRule' }));
  const down = runs(side).flatMap((run) => {
    const y1 = run[0]?.rect.y ?? body.y;
    const last = run.at(-1);
    const y2 = last ? last.rect.y + last.rect.h : y1;
    return top.map((t): Shape => ({ kind: 'line', x1: t.rect.x, y1, x2: t.rect.x, y2, role: 'tableRule' }));
  });
  return [...across, ...down, { kind: 'line', x1: frame.x, y1: body.y, x2: right, y2: body.y, role: 'headRule' }];
}
