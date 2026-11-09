import { firstFamily, matches, readSheet, type Sheet } from './css.js';
import { iconAsGroup } from './icons.js';
import { expandMarkers } from './markers.js';
import { haloBehind, keepSpaces, textAttributes } from './texts.js';
import { attributeValue, descendants, type Element, elementsOf, parseXml, writeXml, type XmlNode } from './xml.js';

/** What `flattenSvg` did, and what Figma's import will still not show as drawn. */
export interface FlattenReport {
  /** Elements whose classes became attributes. */
  readonly classes: number;
  /** Texts with a halo, each now drawn twice: a copy in the halo's stroke behind the text. */
  readonly halos: number;
  /** Marker references drawn into the picture as groups. */
  readonly markersExpanded: number;
  /** Marker references left as they were, because their path has curves or the marker is not written as expected. */
  readonly markersKept: number;
  /** Icons, nested `<svg>` elements, rewritten as groups. */
  readonly icons: number;
  /** Texts whose spaces became no-break spaces instead of `xml:space="preserve"`, such as lines of code. */
  readonly preservedTexts: number;
  /** `filter` attributes removed, such as the stripe of `areas=stripe`; Figma's import draws no filter. */
  readonly filters: number;
  /** Texts and runs with `letter-spacing`, which is kept in the SVG but which Figma's import drops. */
  readonly letterSpacing: number;
}

/** The flattened SVG and what was done to it. */
export interface Flattened {
  readonly svg: string;
  readonly report: FlattenReport;
}

type Count = { -readonly [K in keyof FlattenReport]: number };

const zero = (): Count => ({
  classes: 0,
  halos: 0,
  markersExpanded: 0,
  markersKept: 0,
  icons: 0,
  preservedTexts: 0,
  filters: 0,
  letterSpacing: 0,
});

/**
 * Rewrites the kernel's SVG so Figma's SVG import reads it as drawn. The import ignores `<style>`, inherits no font
 * from the root, drops `marker-end` and `marker-start`, knows no `paint-order`, collapses runs of spaces even under
 * `xml:space="preserve"` and draws no filter. So every class becomes the attributes of the rules that match it, in
 * cascade order; texts get the root's font; a halo text gets a copy behind it; markers are drawn as groups at the
 * ends of their paths; icons become groups; spaces in preserved texts become no-break spaces; filters go.
 * An SVG without a stylesheet comes back unchanged.
 */
export function flattenSvg(svg: string): Flattened {
  const nodes = parseXml(svg);
  const root = elementsOf(nodes).find((element) => element.tag === 'svg');
  const style = root === undefined ? undefined : elementsOf(root.children).find((element) => element.tag === 'style');
  if (root === undefined || style === undefined) return { svg, report: zero() };
  const sheet = readSheet(style.children.join(''), root.attrs.get('class') ?? '');
  root.attrs.delete('class');
  const count = zero();
  root.children = resolveAll(
    root.children.filter((node) => node !== style),
    [],
    sheet,
    count,
  );
  const markers = expandMarkers(root);
  count.markersExpanded = markers.expanded;
  count.markersKept = markers.kept;
  count.filters = dropFilters(root);
  return { svg: writeXml(nodes), report: count };
}

function resolveAll(nodes: readonly XmlNode[], ancestors: readonly string[][], sheet: Sheet, count: Count): XmlNode[] {
  return nodes.flatMap((node) => (typeof node === 'string' ? [node] : resolve(node, ancestors, sheet, count)));
}

/** Assigns the declarations of every rule matching `own` below `ancestors`, the winner last. */
function assign(attrs: Map<string, string>, own: readonly string[], ancestors: readonly string[][], sheet: Sheet) {
  for (const rule of sheet.rules) {
    if (!matches(rule.chain, own, ancestors)) continue;
    for (const [name, value] of Object.entries(rule.props)) {
      if (name === 'font-kerning') attrs.set('style', `font-kerning: ${value}`);
      else attrs.set(name, attributeValue(name === 'font-family' ? firstFamily(value) : value));
    }
  }
  attrs.delete('paint-order');
}

/** One element with its rules applied and its subtree resolved; a halo text comes back as its copy and itself. */
function resolve(element: Element, ancestors: readonly string[][], sheet: Sheet, count: Count): XmlNode[] {
  const own = (element.attrs.get('class') ?? '').split(/\s+/).filter((name) => name !== '');
  element.attrs.delete('class');
  if (own.length > 0) count.classes++;
  const halo = element.tag === 'text' && own.includes('halo');
  const original = new Map(element.attrs);
  assign(
    element.attrs,
    own.filter((name) => !halo || name !== 'halo'),
    ancestors,
    sheet,
  );
  element.children = resolveAll(element.children, [...ancestors, own], sheet, count);
  if (element.tag === 'text') {
    textAttributes(element.attrs, sheet.root);
    if (keepSpaces(element)) count.preservedTexts++;
  }
  if ((element.tag === 'text' || element.tag === 'tspan') && element.attrs.has('letter-spacing')) count.letterSpacing++;
  if (element.tag === 'svg') {
    count.icons++;
    return [iconAsGroup(element)];
  }
  if (!halo) return [element];
  assign(original, own, ancestors, sheet);
  textAttributes(original, sheet.root);
  count.halos++;
  return [haloBehind(element, original), element];
}

/** Removes every `filter` attribute and the `<filter>` definitions, and says how many attributes went. */
function dropFilters(root: Element): number {
  let dropped = 0;
  for (const element of [root, ...descendants(root.children)]) {
    if (element.attrs.delete('filter')) dropped++;
    element.children = element.children.filter((node) => typeof node === 'string' || node.tag !== 'filter');
  }
  return dropped;
}
