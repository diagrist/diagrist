/**
 * An element of an SVG as the kernel writes it: its tag, its attributes in document order with their values as
 * written (escaped), and its children. `empty` records `<tag/>`, so an element without children is written back
 * the way it came.
 */
export interface Element {
  tag: string;
  readonly attrs: Map<string, string>;
  children: XmlNode[];
  empty: boolean;
}

/** An element, or text between tags as written, entities still escaped. */
export type XmlNode = Element | string;

const TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
const ATTRIBUTE = /([\w:.-]+)="([^"]*)"/g;

/**
 * Reads the SVG into a tree: the nodes at the top level, the `<svg>` among them. It reads what `toSvg` writes
 * (double-quoted attributes, no CDATA); comments and processing instructions are left out.
 */
export function parseXml(xml: string): XmlNode[] {
  const top: Element = { tag: '', attrs: new Map(), children: [], empty: false };
  const open: Element[] = [top];
  for (const [whole, closing, tag, raw, selfClosing, text] of xml.matchAll(TOKEN)) {
    const parent = open.at(-1) ?? top;
    if (text !== undefined) {
      parent.children.push(text);
      continue;
    }
    if (tag === undefined || whole.startsWith('<!') || whole.startsWith('<?')) continue;
    if (closing) {
      if (open.length > 1) open.pop();
      continue;
    }
    const attrs = new Map<string, string>();
    for (const [, name, value] of (raw ?? '').matchAll(ATTRIBUTE)) if (name !== undefined) attrs.set(name, value ?? '');
    const element: Element = { tag, attrs, children: [], empty: selfClosing === '/' };
    parent.children.push(element);
    if (!element.empty) open.push(element);
  }
  return top.children;
}

/** Writes nodes back as XML; text and attribute values go out as they are held, already escaped. */
export function writeXml(nodes: readonly XmlNode[]): string {
  return nodes.map(writeNode).join('');
}

function writeNode(node: XmlNode): string {
  if (typeof node === 'string') return node;
  const attrs = [...node.attrs].map(([name, value]) => ` ${name}="${value}"`).join('');
  if (node.children.length === 0 && node.empty) return `<${node.tag}${attrs}/>`;
  return `<${node.tag}${attrs}>${writeXml(node.children)}</${node.tag}>`;
}

/** A CSS value as an attribute value: the characters an attribute cannot hold as they are, escaped. */
export const attributeValue = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** A deep copy, so a halo or a marker can be written twice. */
export function cloneNode(node: XmlNode): XmlNode {
  if (typeof node === 'string') return node;
  return { tag: node.tag, attrs: new Map(node.attrs), children: node.children.map(cloneNode), empty: node.empty };
}

/** The elements among `nodes`, without the text between them. */
export const elementsOf = (nodes: readonly XmlNode[]): Element[] =>
  nodes.filter((node): node is Element => typeof node !== 'string');

/** Every element below `nodes`, depth first in document order. */
export function descendants(nodes: readonly XmlNode[]): Element[] {
  return elementsOf(nodes).flatMap((element) => [element, ...descendants(element.children)]);
}
