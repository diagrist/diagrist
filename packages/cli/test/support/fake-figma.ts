/**
 * The smallest stand-in for Figma's plugin API that `board.js` runs against: nodes with a place, a size, children
 * and shared plugin data, sections, the page and the viewport. Coordinates are relative to the parent, as in
 * FigJam; sections do not grow with their children, as measured on 2026-11-09.
 */
export class FakeNode {
  readonly id: string;
  readonly type: string;
  name: string;
  x = 0;
  y = 0;
  width: number;
  height: number;
  fills: unknown[] = [];
  parent: FakeNode | undefined;
  readonly children: FakeNode[] = [];
  removed = false;
  /** The factors `rescale` was called with, so a test sees whether a layer was scaled or merely resized. */
  readonly rescaled: number[] = [];
  private readonly shared = new Map<string, string>();

  constructor(id: string, type: string, name: string, width: number, height: number) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.width = width;
    this.height = height;
  }

  appendChild(child: FakeNode): void {
    if (child.parent !== undefined) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = this;
    this.children.push(child);
  }

  remove(): void {
    this.parent?.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = undefined;
    for (const node of [this, ...this.descendants()]) node.removed = true;
  }

  resizeWithoutConstraints(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  rescale(factor: number): void {
    this.rescaled.push(factor);
    this.width *= factor;
    this.height *= factor;
  }

  setSharedPluginData(namespace: string, key: string, value: string): void {
    this.shared.set(`${namespace}/${key}`, value);
  }

  getSharedPluginData(namespace: string, key: string): string {
    return this.shared.get(`${namespace}/${key}`) ?? '';
  }

  findAllWithCriteria(criteria: { sharedPluginData: { namespace: string; keys: string[] } }): FakeNode[] {
    const { namespace, keys } = criteria.sharedPluginData;
    return this.descendants().filter((node) => keys.some((key) => node.getSharedPluginData(namespace, key) !== ''));
  }

  descendants(): FakeNode[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }

  /** The place on the page, adding up the places of the parents. */
  absolute(): { x: number; y: number } {
    const above = this.parent?.type === 'PAGE' || this.parent === undefined ? { x: 0, y: 0 } : this.parent.absolute();
    return { x: above.x + this.x, y: above.y + this.y };
  }
}

/** A page, the `figma` global over it, and `upload`, which places a layer the way `upload_assets` does. */
export function fakeFigma() {
  let next = 1;
  const page = new FakeNode('0:1', 'PAGE', 'Page 1', 0, 0);
  const viewed: FakeNode[][] = [];
  const node = (type: string, name: string, width: number, height: number): FakeNode => {
    const made = new FakeNode(`1:${next++}`, type, name, width, height);
    page.appendChild(made);
    return made;
  };
  const figma = {
    currentPage: page,
    createSection: () => node('SECTION', 'Section', 100, 100),
    viewport: { scrollAndZoomIntoView: (nodes: FakeNode[]) => viewed.push(nodes) },
  };
  /** Right of everything on the page at y = 0, 40 px apart, named by the file without its extension. */
  const upload = (name: string, width: number, height: number): FakeNode => {
    const right = Math.max(0, ...page.children.map((n) => n.x + n.width + 40));
    const layer = node('FRAME', name, width, height);
    layer.x = right;
    return layer;
  };
  return { figma, page, upload, viewed };
}

/** Runs a `use_figma` script the way the tool does: top-level `await`, its `return` is the result. */
export async function runScript(script: string, figma: unknown): Promise<unknown> {
  const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
    ...args: string[]
  ) => (figma: unknown) => Promise<unknown>;
  return new AsyncFunction('figma', script)(figma);
}
