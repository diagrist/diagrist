import type { Anchors, NodeForm } from '@diagrist/core';

/** The anchors with the form of each node's body that `formOf` knows; a node it gives none keeps none. */
export const withForms = (anchors: Anchors, formOf: (id: string) => NodeForm | undefined): Anchors => ({
  ...anchors,
  nodes: anchors.nodes.map((n) => {
    const form = formOf(n.id);
    return form === undefined ? n : { ...n, form };
  }),
});
