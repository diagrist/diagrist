import type { Finding } from '@diagrist/core';
import type { ArchitectureModel } from '../model/types.js';
import type { ArchitectureRule } from './presence.js';

export const selfEdge: ArchitectureRule = {
  code: 'A105',
  severity: 'error',
  doc: 'An edge connects two different elements or groups.',
  check: (m) => m.edges.filter((e) => e.from === e.to).map((e) => ({ span: e.source, values: { id: e.from } })),
};

/** The node of one end when the other end is the group that holds it directly. */
function ownGroup(m: ArchitectureModel, node: string, group: string): string | undefined {
  return m.nodes.find((n) => n.id === node)?.group === group && m.groups.some((g) => g.id === group) ? node : undefined;
}

export const edgeToOwnGroup: ArchitectureRule = {
  code: 'A107',
  severity: 'error',
  doc: 'An edge does not lead from an element to the group that holds it, or back.',
  check: (m) =>
    m.edges.flatMap((e): Finding[] => {
      const node = ownGroup(m, e.from, e.to) ?? ownGroup(m, e.to, e.from);
      return node ? [{ span: e.source, values: { from: e.from, to: e.to, node } }] : [];
    }),
};

export const silentEdge: ArchitectureRule = {
  code: 'A710',
  severity: 'warning',
  doc: 'An edge says what happens: a label or a protocol (`via=`).',
  check: (m) =>
    m.edges
      .filter((e) => e.label === undefined && e.via === undefined)
      .map((e) => ({ span: e.source, values: { from: e.from, to: e.to } })),
};

export const unmarkedDecision: ArchitectureRule = {
  code: 'A801',
  severity: 'warning',
  doc: 'A decision of the bar has a mark in the picture, on an element or a step (`mark=`).',
  check: (m) => {
    const marks = new Set([...m.nodes, ...m.edges].map((x) => x.mark));
    return m.decisions.filter((d) => !marks.has(d.id)).map((d) => ({ span: d.span, values: { id: d.id } }));
  },
};
