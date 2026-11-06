import { lineFindings, linesOfDrawing, type Rect, segmentMeetsRect } from '@diagrist/core';
import { scoreOf } from '@diagrist/layout-grid';
import type { UseCaseModel } from '../model.js';
import { anchorsOf } from './anchors.js';
import type { Price } from './auto/index.js';
import { drawnOf } from './drawn.js';
import type { Laid } from './laid.js';
import { placedAll } from './placed.js';

/** What a note costs that lies on a box or text: as much as a line through a box. */
const CROWDED = 10_000;
/** A line that only grazes the corner of a subject, by less than this, does not pass it. */
const GRAZE = 8;
/** What a line costs that runs through a subject holding neither of its ends: as much as a crossing. */
const FOREIGN = 1_000;

/** Lines that run through the frame of a subject holding neither of their ends, which reads as if they belonged to it. */
function foreignPasses(m: UseCaseModel, laid: Laid): number {
  return drawnOf(m, laid.routes).reduce((n, d) => {
    const [p, q] = [laid.routes[d.route]?.points[0], laid.routes[d.route]?.points.at(-1)];
    if (p === undefined || q === undefined) return n;
    const ends = [d.relation.from, d.relation.to].map((id) => m.cases.get(id)?.subject);
    const inner = (r: Rect) => ({ x: r.x + GRAZE, y: r.y + GRAZE, w: r.w - 2 * GRAZE, h: r.h - 2 * GRAZE });
    return n + laid.layout.groups.filter((g) => !ends.includes(g.id) && segmentMeetsRect(p, q, inner(g.rect))).length;
  }, 0);
}

/**
 * The price of a laid out use case diagram by the measure of the line check (`scoreOf` on what the kernel checks),
 * with a note on a box or text and a line through a foreign subject added: its cost, whether it is clean, and how
 * often a line runs through a box or text, crosses another or passes a foreign subject.
 */
export function priceOf(m: UseCaseModel): Price {
  return (laid) => {
    const drawn = drawnOf(m, laid.routes);
    const anchors = anchorsOf(laid, drawn, { width: laid.layout.width, height: laid.layout.bottom });
    const input = linesOfDrawing({ anchors, placed: placedAll(laid, m) });
    const score = scoreOf(input);
    const passes = foreignPasses(m, laid);
    const through = lineFindings(input, { crossingsUpTo: 0 }).filter((f) => f.rule === 'through').length;
    const bad = through + score.metrics.crossings + passes;
    const on = laid.crowded.filter((c) => c.on).length;
    return { cost: score.cost + CROWDED * on + FOREIGN * passes, clean: score.clean && on + passes === 0, bad };
  };
}
