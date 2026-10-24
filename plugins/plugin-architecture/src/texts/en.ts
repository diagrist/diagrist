import type { Texts } from './index.js';

/** English texts, the default. */
export const EN: Texts = {
  kinds: {
    context: 'Context diagram (C4 L1)',
    container: 'Container diagram (C4 L2)',
    component: 'Component diagram (C4 L3)',
  },
  edges: {
    sync: 'synchronous call',
    async: 'asynchronous domain event',
    dependency: 'dependency',
    data: 'data flow',
    link: 'connection without direction',
    duplex: 'call in both directions',
  },
  roles: { own: 'own system', shared: 'shared infrastructure', external: 'external system' },
  status: { planned: 'planned', deprecated: 'deprecated' },
  statusInBox: { planned: 'planned', deprecated: 'deprecated' },
  shapes: { db: 'database', queue: 'queue', store: 'store', job: 'job', app: 'application' },
  emph: 'core decision',
  replicas: 'several instances',
  mark: 'decision, see the bar',
  icon: 'icon = technology or role of the element',
  flow: (id, from, to) => `Flow ${id} (${from}) to (${to})`,
  prose: {
    summary: (title, kind, nodes, groups) => `${title}. ${kind} with ${nodes} elements in ${groups} groups.`,
    diagram: 'Diagram',
    group: 'Group',
    within: 'in',
    tag: 'tag',
    ungrouped: 'Without group',
    layer: 'Layer',
    note: 'Note on',
    edge: 'Further edge',
    markOf: 'mark',
    frameAround: 'Frame around',
    instances: (count) => `${count} instances`,
    kinds: {
      sync: 'synchronous',
      async: 'asynchronous',
      dependency: 'dependency',
      data: 'data flow',
      link: 'connection',
      duplex: 'both directions',
    },
  },
};
