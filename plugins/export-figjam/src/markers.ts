import { type PathEnd, pathEnds } from './path.js';
import { cloneNode, descendants, type Element, type XmlNode } from './xml.js';

/** How many marker references were drawn into the picture, and how many stay because their path could not be read. */
export interface MarkerCount {
  expanded: number;
  kept: number;
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

const ENDS = [
  ['marker-end', 'end'],
  ['marker-start', 'start'],
] as const;

/** The marker a reference such as `url(#m-open)` names. */
const referenced = (value: string | undefined): string | undefined => /^url\(#([^)]+)\)$/.exec(value ?? '')?.[1];

/**
 * The angle a marker is turned by at one end: along the line for `auto`, at the start backwards for
 * `auto-start-reverse`, a fixed angle as written. `undefined` for anything else.
 */
function angleAt(marker: Element, end: PathEnd, which: 'start' | 'end'): number | undefined {
  const orient = marker.attrs.get('orient') ?? '0';
  if (orient === 'auto') return end.angle;
  if (orient === 'auto-start-reverse') return which === 'start' ? end.angle + 180 : end.angle;
  const fixed = Number(orient);
  return Number.isFinite(fixed) ? fixed : undefined;
}

/**
 * The marker drawn at one end as a group: moved to the end, turned, and shifted by its reference point. Only markers
 * in user space without a view box are read, which is how the kernel writes them; other markers stay references.
 */
function head(marker: Element, end: PathEnd, which: 'start' | 'end'): Element | undefined {
  if (marker.attrs.get('markerUnits') !== 'userSpaceOnUse' || marker.attrs.has('viewBox')) return undefined;
  const angle = angleAt(marker, end, which);
  if (angle === undefined) return undefined;
  const ref = [Number(marker.attrs.get('refX') ?? 0), Number(marker.attrs.get('refY') ?? 0)];
  const transform = `translate(${round(end.x)} ${round(end.y)}) rotate(${round(angle)}) translate(${round(-(ref[0] ?? 0))} ${round(-(ref[1] ?? 0))})`;
  return {
    tag: 'g',
    attrs: new Map([['transform', transform]]),
    children: marker.children.map(cloneNode),
    empty: false,
  };
}

/** A path followed by the markers at its ends, inside a group with the path's own move when it has one. */
function withHeads(path: Element, markers: ReadonlyMap<string, Element>, count: MarkerCount): XmlNode[] {
  const heads: Element[] = [];
  const ends = pathEnds(path.attrs.get('d') ?? '');
  for (const [attribute, which] of ENDS) {
    const id = referenced(path.attrs.get(attribute));
    if (id === undefined) continue;
    const marker = markers.get(id);
    const drawn = marker === undefined || ends === undefined ? undefined : head(marker, ends[which], which);
    if (drawn === undefined) {
      count.kept++;
      continue;
    }
    heads.push(drawn);
    path.attrs.delete(attribute);
    count.expanded++;
  }
  const move = path.attrs.get('transform');
  if (heads.length === 0 || move === undefined) return [path, ...heads];
  return [path, { tag: 'g', attrs: new Map([['transform', move]]), children: heads, empty: false }];
}

/**
 * Draws every `marker-end` and `marker-start` into the picture, since Figma's import drops them: the marker's content,
 * whose classes are already resolved, as a group at the path's end. `<marker>` elements no path refers to any more
 * leave `<defs>`.
 */
export function expandMarkers(root: Element): MarkerCount {
  const markers = new Map(
    descendants(root.children)
      .filter((element) => element.tag === 'marker')
      .map((marker) => [marker.attrs.get('id') ?? '', marker] as const),
  );
  const count: MarkerCount = { expanded: 0, kept: 0 };
  const visit = (parent: Element): void => {
    parent.children = parent.children.flatMap((node) => {
      if (typeof node === 'string' || node.tag === 'marker') return [node];
      visit(node);
      return node.tag === 'path' ? withHeads(node, markers, count) : [node];
    });
  };
  visit(root);
  const still = new Set(
    descendants(root.children).flatMap((element) =>
      ENDS.map(([attribute]) => referenced(element.attrs.get(attribute))),
    ),
  );
  const prune = (parent: Element): void => {
    parent.children = parent.children.filter(
      (node) => typeof node === 'string' || node.tag !== 'marker' || still.has(node.attrs.get('id')),
    );
    for (const node of parent.children) if (typeof node !== 'string' && node.tag !== 'marker') prune(node);
  };
  prune(root);
  return count;
}
