import { type Placed, textWidth } from '@diagrist/core';
import { type GridLayout, placedOf } from '@diagrist/layout-grid';
import type { UseCaseModel } from '../model.js';
import { captionBoxes } from './drawn.js';
import type { Laid } from './laid.js';
import { UC_FONTS } from './metrics.js';
import { SUBJECT_TITLE } from './spec.js';

const span = <T>(s: T | undefined) => (s === undefined ? {} : { span: s });

/**
 * A label or note without a frame of its own belongs into the innermost frame around it, where the layout put it: a
 * multiplicity at a use case inside its subject, a note beside it. One lying on a frame line stays without.
 */
function homed(p: Placed, grid: GridLayout): Placed {
  if (p.within !== undefined) return p;
  const r = p.rect;
  const around = grid.groups.filter(
    (g) =>
      g.id !== p.key &&
      r.x >= g.rect.x &&
      r.y >= g.rect.y &&
      r.x + r.w <= g.rect.x + g.rect.w &&
      r.y + r.h <= g.rect.y + g.rect.h,
  );
  const home = around.at(-1);
  return home ? { ...p, within: home.id } : p;
}

/** What a laid out use case diagram placed, for the kernel's placement check: boxes, texts, roles, names of subjects and notes. */
export function placedAll(t: Laid, m: UseCaseModel): Placed[] {
  const lines = t.labels.filter((l) => l.part !== 'detail');
  const grid = placedOf(t.spec, t.layout, t.routes, lines).map((p) => (p.kind === 'text' ? homed(p, t.layout) : p));
  const captions = captionBoxes(t.spec, t.layout).map(
    (c): Placed => ({ key: `${c.id}.name`, kind: 'text', rect: c.rect, ...span(m.actors.get(c.id)?.span) }),
  );
  const titles = t.layout.groups.map((g): Placed => {
    const s = m.subjects.get(g.id);
    const font = UC_FONTS.name;
    const rect = {
      x: g.rect.x + SUBJECT_TITLE.x,
      y: g.rect.y + SUBJECT_TITLE.y - font.size,
      w: textWidth(s?.label ?? '', font),
      h: font.size + 4,
    };
    return { key: `${g.id}.name`, kind: 'text', rect, within: g.id, ...span(s?.span) };
  });
  const notes = t.comments.flatMap((c, i): Placed[] => {
    const key = `${c.on ?? t.routes[c.route ?? -1]?.edge ?? ''}.note.${i + 1}`;
    const texts = t.labels.filter((l) => l.part === 'detail' && l.route === c.route && c.route !== undefined);
    return [
      homed({ key, kind: 'box', rect: c.rect }, t.layout),
      ...texts.map((l, k): Placed => ({ key: `${key}.${k + 1}`, kind: 'text', rect: l.box, within: key })),
    ];
  });
  return [...grid, ...captions, ...titles, ...notes];
}
