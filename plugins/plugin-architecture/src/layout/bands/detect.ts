import type { ArchGroup, ArchitectureModel, ArchNode } from '../../model/types.js';

/**
 * A band of grid columns with `groups.form: band`: neighbouring columns with the same prefix before a dot, named by
 * what stands in them. `group` names it by the frame that fills it, `people` holds only people, `focus` the
 * emphasized element, `neighbours` elements outside every frame.
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

/** Ids of the elements in a frame and in the frames nested into it. */
function membersDeep(model: ArchitectureModel, g: ArchGroup): string[] {
  const children = model.groups.filter((c) => c.parent === g.id);
  return [...g.members, ...children.flatMap((c) => membersDeep(model, c))];
}

/** How a set of columns is named, or nothing when no name follows from what stands in it. */
function bandOf(model: ArchitectureModel, cols: readonly string[]): Band | undefined {
  const nodes = model.nodes.filter((n) => n.at && cols.includes(n.at.col));
  if (nodes.length === 0) return undefined;
  const inside = (id: string) => nodes.some((n) => n.id === id);
  const parentOf = (g: ArchGroup) => model.groups.find((p) => p.id === g.parent);
  const filling = model.groups.filter((g) => {
    const all = membersDeep(model, g);
    const parent = parentOf(g);
    const parentInside = parent !== undefined && membersDeep(model, parent).every(inside);
    return g.title !== '' && all.length > 0 && all.every(inside) && !parentInside;
  });
  const [group] = filling;
  if (filling.length > 1) return undefined;
  if (group) return { cols, kind: 'group', group, nodes };
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

/**
 * The model the grid places: frames that head a band are drawn as its head instead, so they leave the grid with
 * their pads, and the frames nested into them lose their parent.
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
