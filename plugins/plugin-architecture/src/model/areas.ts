import { type Area, lineArea } from '@diagrist/core';
import type { ArchEdge, ArchitectureModel } from './types.js';

/** The area of a group: its own, else that of the group it lies in (ADR 0033). */
export function groupArea(
  model: ArchitectureModel,
  id: string | undefined,
  seen: Set<string> = new Set(),
): string | undefined {
  const group = model.groups.find((g) => g.id === id);
  if (group === undefined || seen.has(group.id)) return undefined;
  seen.add(group.id);
  return group.area ?? groupArea(model, group.parent, seen);
}

/** The area of an element: its own, else that of its group. */
export function nodeArea(model: ArchitectureModel, id: string): string | undefined {
  const node = model.nodes.find((n) => n.id === id);
  return node === undefined ? groupArea(model, id) : (node.area ?? groupArea(model, node.group));
}

/** The area of an edge: its own, else the coloured one of its first end, else of its second. */
export const edgeArea = (model: ArchitectureModel, e: ArchEdge): string | undefined =>
  lineArea(model.areas, e.area, nodeArea(model, e.from), nodeArea(model, e.to));

/** The areas something in the picture belongs to, in their order, each with the names of its elements. */
export function areaMembers(model: ArchitectureModel): { readonly area: Area; readonly members: string[] }[] {
  const used = new Set([
    ...model.nodes.map((n) => nodeArea(model, n.id)),
    ...model.groups.map((g) => groupArea(model, g.id)),
    ...model.edges.map((e) => edgeArea(model, e)),
  ]);
  return model.areas.list
    .filter((area) => used.has(area.id))
    .map((area) => ({
      area,
      members: model.nodes.filter((n) => nodeArea(model, n.id) === area.id).map((n) => n.label),
    }));
}
