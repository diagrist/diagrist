import type { ArchGroup, ArchNode, Role } from '../../model/types.js';

/** Who an element belongs to in `look=panel`: the role of its group, people on their own, or nobody named. */
export type Party = Role | 'person' | 'none';

/** The parties in the order the legend lists them. */
export const PARTIES: readonly Party[] = ['own', 'shared', 'external', 'person', 'none'];

/** The role of the nearest group around `id` that names one. */
function roleOf(groupId: string | undefined, groups: ReadonlyMap<string, ArchGroup>): Role | undefined {
  const seen = new Set<string>();
  let g = groupId === undefined ? undefined : groups.get(groupId);
  while (g && !seen.has(g.id)) {
    if (g.role) return g.role;
    seen.add(g.id);
    g = g.parent === undefined ? undefined : groups.get(g.parent);
  }
  return undefined;
}

/** The party of an element: people are their own party, others take the role of their group. */
export const partyOf = (n: ArchNode, groups: ReadonlyMap<string, ArchGroup>): Party =>
  n.keyword === 'person' ? 'person' : (roleOf(n.group, groups) ?? 'none');
