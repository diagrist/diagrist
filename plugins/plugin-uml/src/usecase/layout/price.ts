import { lineFindings, linesOfDrawing, type Rect, segmentMeetsRect } from '@diagrist/core';
import { scoreOf } from '@diagrist/layout-grid';
import type { UseCaseModel } from '../model.js';
import { anchorsOf } from './anchors.js';
import type { Price } from './auto/index.js';
import { drawnOf } from './drawn.js';
import type { Laid } from './laid.js';
import { UC } from './metrics.js';
import { placedAll } from './placed.js';

/** What a note costs that lies on a box or text: as much as a line through a box. */
const CROWDED = 10_000;
/** What a note costs that lies on a line or a frame line: as much as a text on a line. */
const NEAR = 600;
/** A pixel of a note's link beyond the gap a note keeps costs ten pixels of line, so a note stays close. */
const LINK = 1;
/**
 * Room a line keeps from the frame of a subject that holds neither of its ends, as the line check keeps it from
 * boxes: a line that cuts the corner of a frame, or passes it closer than this, reads as if it belonged to it.
 */
const CLEAR = 6;
/** What a pixel of the picture's height costs, as `scoreOf` prices a pixel of its width: compact pictures win. */
const HEIGHT = 0.1;
/** What a line costs that runs through or along a subject holding neither of its ends: as much as a crossing. */
const FOREIGN = 1_000;

/** Lines that run through, or too close past, the frame of a subject holding neither of their ends. */
function foreignPasses(m: UseCaseModel, laid: Laid): number {
  return drawnOf(m, laid.routes).reduce((n, d) => {
    const points = laid.routes[d.route]?.points ?? [];
    const ends = [d.relation.from, d.relation.to].map((id) => m.cases.get(id)?.subject);
    const passes = (r: Rect) => points.slice(1).some((q, i) => segmentMeetsRect(points[i] ?? q, q, r, CLEAR));
    return n + laid.layout.groups.filter((g) => !ends.includes(g.id) && passes(g.rect)).length;
  }, 0);
}

/**
 * The price of a laid out use case diagram by the measure of the line check (`scoreOf` on what the kernel checks),
 * with the height of the picture, a note on a box or text, a note on a line or frame line, the links of notes beyond
 * their gap and a line through a foreign subject added: its cost, whether it is clean, and how often a line runs
 * through a box or text, crosses another or passes a foreign subject.
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
    const near = laid.crowded.filter((c) => !c.on && !c.far).length;
    const links = laid.comments.reduce((sum, c) => {
      const [p, q] = c.link;
      return c.route === undefined ? sum + Math.max(0, Math.hypot(q[0] - p[0], q[1] - p[1]) - UC.noteGap) : sum;
    }, 0);
    return {
      cost: score.cost + HEIGHT * score.metrics.height + CROWDED * on + NEAR * near + LINK * links + FOREIGN * passes,
      clean: score.clean && on + passes === 0,
      bad,
    };
  };
}
