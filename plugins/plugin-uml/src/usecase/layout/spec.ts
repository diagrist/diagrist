/** Where the name of a subject stands in its frame, from the top left corner. */
export const SUBJECT_TITLE = { x: 12, y: 20 } as const;

/** Id of the edge of the relation at `index` in source order. */
export const edgeId = (index: number): string => `rel-${index}`;
