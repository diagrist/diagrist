import { firstFamily } from './css.js';
import { cloneNode, type Element, type XmlNode } from './xml.js';

/** The space that FigJam's import keeps as it is: it collapses runs of plain spaces and loses text after them. */
const KEPT_SPACE = '\u00a0';

/**
 * Gives a `<text>` what Figma would otherwise take from the root: the first family of the root's stack and its size,
 * when the text names none. The root's `font-kerning` goes into `style`, because resvg and CSS read it only as a
 * property, never as an attribute.
 */
export function textAttributes(attrs: Map<string, string>, root: Readonly<Record<string, string>>): void {
  const family = root['font-family'];
  const size = root['font-size'];
  const kerning = root['font-kerning'];
  if (!attrs.has('font-family') && family !== undefined) attrs.set('font-family', firstFamily(family));
  if (!attrs.has('font-size') && size !== undefined) attrs.set('font-size', size);
  if (kerning !== undefined && !attrs.has('style')) attrs.set('style', `font-kerning: ${kerning}`);
}

/**
 * Turns a text the kernel marked `xml:space="preserve"`, such as an indented line of code, into one whose spaces
 * survive without it: every space of its content, in its runs too, becomes a no-break space, and the attribute goes.
 * FigJam's import was measured to turn "09 a   b    c" into "09 a b ", while a no-break space is never collapsed.
 */
export function keepSpaces(text: Element): boolean {
  if (text.attrs.get('xml:space') !== 'preserve') return false;
  text.attrs.delete('xml:space');
  const visit = (nodes: XmlNode[]): XmlNode[] =>
    nodes.map((node) => {
      if (typeof node === 'string') return node.replaceAll(' ', KEPT_SPACE);
      node.children = visit(node.children);
      return node;
    });
  text.children = visit(text.children);
  return true;
}

/**
 * The copy of a halo text that is drawn behind it: the text with the halo's stroke, filled in the stroke's colour,
 * so it widens into the gap a line leaves for the label. Figma knows no `paint-order`, which drew this in one text.
 * `haloAttrs` are the text's attributes with the halo's rule applied; the front copy is `front` without it.
 */
export function haloBehind(front: Element, haloAttrs: ReadonlyMap<string, string>): Element {
  const back = cloneNode(front) as Element;
  back.attrs.clear();
  for (const [name, value] of haloAttrs) back.attrs.set(name, value);
  back.attrs.delete('paint-order');
  back.attrs.delete('xml:space');
  back.attrs.set('fill', haloAttrs.get('stroke') ?? '#ffffff');
  return back;
}
