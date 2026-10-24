import type { ArchGroup, ArchitectureModel, ArchNode } from '../../model/types.js';

/**
 * A column band of `look=columns`: neighbouring grid columns with the same prefix before a dot, named by what
 * stands in them. `group` names the band by its frame, `people` holds only people, `focus` the emphasized element,
 * `neighbours` elements outside every frame.
 */
export interface Band {
  readonly cols: readonly string[];
  readonly kind: 'group' | 'people' | 'focus' | 'neighbours';
  readonly group?: ArchGroup;
  readonly nodes: readonly ArchNode[];
}

const prefix = (name: string): string => name.split('.')[0] ?? name;

/** Neighbouring columns with one prefix, in grid order. */
function columnSets(cols: readonly string[]): string[][] {
  const sets: string[][] = [];
  for (const col of cols) {
    const last = sets.at(-1);
    if (last && prefix(last[0] ?? '') === prefix(col)) last.push(col);
    else sets.push([col]);
  }
  return sets;
}

/** Ids of the elements in a group and in the groups nested into it. */
function membersDeep(model: ArchitectureModel, g: ArchGroup): string[] {
  const children = model.groups.filter((c) => c.parent === g.id);
  return [...g.members, ...children.flatMap((c) => membersDeep(model, c))];
}

/** How a set of columns is named, or nothing when no name follows from what stands in it. */
function bandOf(model: ArchitectureModel, cols: readonly string[]): Band | undefined {
  const inside = (id: string) => cols.includes(model.nodes.find((n) => n.id === id)?.at?.col ?? '');
  const nodes = model.nodes.filter((n) => n.at && cols.includes(n.at.col));
  if (nodes.length === 0) return undefined;
  const framed = model.groups.filter((g) => {
    const all = membersDeep(model, g);
    const parentInside =
      g.parent !== undefined && membersDeep(model, model.groups.find((p) => p.id === g.parent) ?? g).every(inside);
    return all.length > 0 && all.every(inside) && !parentInside && g.title !== '';
  });
  const [group] = framed;
  if (framed.length === 1 && group) return { cols, kind: 'group', group, nodes };
  if (framed.length > 1) return undefined;
  if (nodes.every((n) => n.keyword === 'person')) return { cols, kind: 'people', nodes };
  if (nodes.some((n) => n.emph)) return { cols, kind: 'focus', nodes };
  if (nodes.every((n) => n.group === undefined)) return { cols, kind: 'neighbours', nodes };
  return undefined;
}

/**
 * The column bands of a model: every set of columns with its name, as long as each can be named and there are at
 * least two; otherwise none, and the picture stands without column heads.
 */
export function bandsOf(model: ArchitectureModel): Band[] {
  const bands = columnSets(model.cols).map((cols) => bandOf(model, cols));
  const named = bands.filter((b): b is Band => b !== undefined);
  return named.length >= 2 && named.length === bands.length ? named : [];
}

/** The layers that become row bands: only where no column bands stand, and only in an adaptive grid. */
export const rowBandsOf = (model: ArchitectureModel, bands: readonly Band[]): ArchitectureModel['layers'] =>
  bands.length === 0 && model.adaptive ? model.layers : [];

/**
 * The model the grid places: frames that name a band are drawn as the band instead, so they leave the grid with
 * their pads, and their child frames lose the parent.
 */
export function withoutBandFrames(model: ArchitectureModel, bands: readonly Band[]): ArchitectureModel {
  const gone = new Set(bands.flatMap((b) => (b.group ? [b.group.id] : [])));
  if (gone.size === 0) return model;
  const groups = model.groups
    .filter((g) => !gone.has(g.id))
    .map((g): ArchGroup => {
      if (g.parent === undefined || !gone.has(g.parent)) return g;
      const { parent: _, ...rest } = g;
      return rest;
    });
  return { ...model, groups };
}
