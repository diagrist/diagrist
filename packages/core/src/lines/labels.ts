import type { Rect } from '../geometry.js';
import { bundled, routeToRect, segmentsOf, TOLERANCE, tenth } from './lines.js';
import type { Obstacle } from './obstacles.js';
import { overlaps, union } from './rects.js';
import type { LineFinding, LineInput, LineLabel, LineThresholds } from './types.js';

/** Texts of one line that touch each other, such as the lines of a wrapped text, read as one block. */
interface Block {
  readonly key: string;
  readonly edge: string;
  readonly box: Rect;
}

/** The texts of each line, joined into blocks where they touch; a block is keyed by its first text. */
function blocksOf(labels: readonly LineLabel[]): Block[] {
  const blocks: { edge: string; keys: string[]; boxes: Rect[] }[] = [];
  for (const l of labels) {
    const touching = blocks.filter((b) => b.edge === l.edge && b.boxes.some((r) => overlaps(r, l.box, TOLERANCE)));
    const [into, ...rest] = touching;
    if (into === undefined) {
      blocks.push({ edge: l.edge, keys: [l.key], boxes: [l.box] });
      continue;
    }
    into.keys.push(l.key, ...rest.flatMap((b) => b.keys));
    into.boxes.push(l.box, ...rest.flatMap((b) => b.boxes));
    for (const b of rest) blocks.splice(blocks.indexOf(b), 1);
  }
  return blocks.map((b) => ({ key: b.keys[0] as string, edge: b.edge, box: union(b.boxes) }));
}

const centre = (r: Rect) => [tenth(r.x + r.w / 2), tenth(r.y + r.h / 2)] as const;

/**
 * Texts on lines that do not say clearly which line they belong to (Q9): a block of texts further than `labelNear`
 * from its own line (`far`) or nearer than `labelClear` to a line outside its bundle (`near`), and a text on a box,
 * another text or a head (`overlap`).
 */
export function labelFindings(input: LineInput, obstacles: readonly Obstacle[], t: LineThresholds): LineFinding[] {
  const segments = new Map(input.routes.map((r) => [r.edge, segmentsOf(r)]));
  const labels = input.labels ?? [];
  const placing = blocksOf(labels).flatMap((b) => {
    const route = input.routes.find((r) => r.edge === b.edge);
    if (route === undefined) return [];
    const base = { rule: 'label' as const, at: centre(b.box), label: b.key };
    const own = routeToRect(segments.get(b.edge) ?? [], b.box);
    const far: LineFinding[] =
      own > t.labelNear + TOLERANCE ? [{ ...base, edges: [b.edge], detail: 'far', value: tenth(own) }] : [];
    const near = input.routes
      .filter((s) => !bundled(route, s))
      .flatMap((s): LineFinding[] => {
        const d = routeToRect(segments.get(s.edge) ?? [], b.box);
        if (d >= t.labelClear - TOLERANCE) return [];
        return [{ ...base, edges: [b.edge, s.edge].sort(), detail: 'near', value: tenth(d) }];
      });
    return [...far, ...near];
  });
  const covered = labels.flatMap((l) =>
    obstacles
      .filter((o) => o.key !== l.key && overlaps(o.rect, l.box, -TOLERANCE))
      .map(
        (o): LineFinding => ({
          rule: 'label',
          edges: [l.edge],
          at: centre(l.box),
          label: l.key,
          other: o.key,
          detail: 'overlap',
        }),
      ),
  );
  return [...placing, ...covered];
}
