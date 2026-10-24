import type { Finding } from '@diagrist/core';
import { list } from '@diagrist/lang';
import type { ArchitectureModel, ArchNode } from '../model/types.js';
import type { ArchitectureRule } from './presence.js';

type Check = (m: ArchitectureModel) => Finding[];

/** Area of one element: span and slot need an adaptive grid, reach right and down, and split one axis only. */
function area(m: ArchitectureModel, n: ArchNode): Finding[] {
  const out: Finding[] = [];
  const at = (values: Record<string, string>) => out.push({ span: n.source, values: { id: n.id, ...values } });
  const sized = [
    n.span && 'span',
    n.slot && 'slot',
    n.width !== undefined && 'width',
    n.height !== undefined && 'height',
  ];
  if (!m.adaptive) for (const what of sized) if (what) at({ case: 'needsAdaptive', what });
  if ((n.span || n.slot) && n.keyword === 'person') at({ case: 'personArea' });
  if (!n.span || !n.at) return out;
  const { col, row } = n.span;
  if (!m.cols.includes(col) || m.cols.indexOf(col) < m.cols.indexOf(n.at.col))
    at({ case: 'spanColumn', found: col, start: n.at.col });
  if (row !== undefined && (!m.rows.includes(row) || m.rows.indexOf(row) < m.rows.indexOf(n.at.row)))
    at({ case: 'spanRow', found: row, start: n.at.row });
  if (row !== undefined && row !== n.at.row && col !== n.at.col && n.slot) at({ case: 'slotAxes' });
  return out;
}

const areas: Check = (m) => m.nodes.flatMap((n) => area(m, n));

/** Does following `in` from the group lead back to it? */
function cyclic(m: ArchitectureModel, id: string): boolean {
  const seen = new Set<string>();
  for (let p = m.groups.find((g) => g.id === id)?.parent; p !== undefined; ) {
    if (p === id) return true;
    if (seen.has(p)) return false;
    seen.add(p);
    p = m.groups.find((g) => g.id === p)?.parent;
  }
  return false;
}

const groups: Check = (m) =>
  m.groups.flatMap((g): Finding[] => [
    ...(g.cover !== undefined && !m.cols.includes(g.cover)
      ? [{ span: g.source, values: { case: 'coverColumn', found: g.cover, known: list(m.cols) } }]
      : []),
    ...(cyclic(m, g.id) ? [{ span: g.source, values: { case: 'groupCycle', id: g.id } }] : []),
  ]);

const bundles: Check = (m) => {
  const names = [...new Set(m.edges.flatMap((e) => (e.bundle === undefined ? [] : [e.bundle])))];
  return names.flatMap((name): Finding[] => {
    const edges = m.edges.filter((e) => e.bundle === name);
    const [first] = edges;
    if (first === undefined) return [];
    const out: Finding[] = [];
    const at = (values: Record<string, string>) => out.push({ span: first.source, values: { name, ...values } });
    if (!m.adaptive) at({ case: 'needsAdaptive', what: 'bundle' });
    if (!edges.every((e) => e.from === first.from) && !edges.every((e) => e.to === first.to))
      at({ case: 'bundleEnds' });
    if (edges.some((e) => e.kind !== first.kind)) at({ case: 'bundleKinds' });
    return out;
  });
};

const layers: Check = (m) => {
  const seen = new Set<string>();
  return m.layers.flatMap((l): Finding[] => {
    const out: Finding[] = [];
    const at = (values: Record<string, string>) => out.push({ span: l.source, values });
    if (!m.adaptive) at({ case: 'needsAdaptive', what: 'layer' });
    if (!m.rows.includes(l.row)) at({ case: 'layerRow', found: l.row, known: list(m.rows) });
    if (seen.has(l.row)) at({ case: 'layerTwice', found: l.row });
    seen.add(l.row);
    return out;
  });
};

export const layoutConstraints: ArchitectureRule = {
  code: 'A109',
  severity: 'error',
  doc: 'Areas (`span`, `slot`, `width`, `height`), bundles and layers need `layout=adaptive`; areas reach right and down within the grid; `cover` names a column; groups nest without a cycle; a bundle shares an end and a kind; a row has one layer.',
  check: (m) => [...areas(m), ...groups(m), ...bundles(m), ...layers(m)],
};
