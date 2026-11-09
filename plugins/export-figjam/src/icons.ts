import type { Element } from './xml.js';

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * A nested `<svg x y width height viewBox>`, as the kernel draws an icon, rewritten as a `<g>` that moves and scales
 * its content the same way (`preserveAspectRatio` left at its default, centred and whole), so the import need not
 * support nested viewports. An icon's content lies inside its view box, so the clip a viewport adds changes nothing.
 * Without a readable `viewBox` only the move is kept.
 */
export function iconAsGroup(svg: Element): Element {
  const attrs = new Map(svg.attrs);
  const read = (name: string): number => Number(attrs.get(name) ?? 0);
  const [x, y, width, height] = [read('x'), read('y'), read('width'), read('height')];
  const box = (attrs.get('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  for (const name of ['x', 'y', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'overflow']) attrs.delete(name);
  const [minX = 0, minY = 0, boxWidth = 0, boxHeight = 0] = box;
  let transform = `translate(${round(x)} ${round(y)})`;
  if (box.length === 4 && box.every(Number.isFinite) && boxWidth > 0 && boxHeight > 0) {
    const scale = Math.min(width / boxWidth, height / boxHeight);
    const dx = x + (width - boxWidth * scale) / 2 - minX * scale;
    const dy = y + (height - boxHeight * scale) / 2 - minY * scale;
    transform = `translate(${round(dx)} ${round(dy)}) scale(${round(scale)})`;
  }
  const group = new Map([['transform', transform], ...attrs]);
  return { tag: 'g', attrs: group, children: svg.children, empty: svg.empty };
}
