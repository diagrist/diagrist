/** A picture as far as the forms of its nodes go, read without depending on the kernel. */
export interface FormedPicture {
  readonly anchors?: { readonly nodes: readonly { readonly form?: string }[] };
}

/**
 * How many nodes of the pictures have each form, as `{ form: count }`; a node without a form counts as `none`, so a
 * test that expects every node to have one names the missing ones at once.
 */
export function formCounts(pictures: readonly FormedPicture[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of pictures.flatMap((p) => p.anchors?.nodes ?? [])) {
    const form = node.form ?? 'none';
    counts[form] = (counts[form] ?? 0) + 1;
  }
  return counts;
}
