import { xmlSafe } from '@diagrist/lang';
import { areaClass, areaDefs, areaRules } from './areas/paint.js';
import type { AreaTone } from './areas/tones.js';
import { areaUses } from './areas/uses.js';
import { markerElement, markersInUse, num } from './markers.js';
import type { Scene, Shape, TextRun } from './scene.js';
import { classesOf, type Icon, type Styles } from './styles.js';

/** How `toSvg` writes the document. */
export interface SvgOptions {
  /** Leave out stylesheet and background, for hosts that style the classes themselves. */
  readonly inline?: boolean;
}

/** Text as XML content or attribute value: markup escaped, and what XML cannot hold replaced, so the SVG always parses. */
const escapeText = (text: string): string =>
  xmlSafe(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Writes a scene as a standalone SVG document. The output is part of the public contract: ids from `domId`
 * on groups, `marker-end="url(#m-<id>)"` on paths, the markers they reference in `<defs>`, one shape per line. A
 * group of an area carries its class, and its paths end in the area's copy of their marker, `m-<id>-<tone>`
 * (ADR 0033).
 */
export function toSvg(scene: Scene, styles: Styles, options: SvgOptions = {}): string {
  const { width, height } = scene;
  const title = escapeText(scene.title);
  const paint = scene.areas ?? 'tint';
  const areas = areaUses(scene.children, styles);
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="${styles.root}" role="img" aria-label="${title}">`;
  const markers = markersInUse(scene.children, styles);
  const used = usedClasses(scene.children, styles, new Set(markers.classes));
  const sheet = () => styleSheet(styles, used) + areaRules(styles, areas, paint, used).join('');
  const style =
    options.inline === true
      ? ''
      : `<style>${sheet()}</style><rect width="${width}" height="${height}" fill="${styles.canvas}"/>`;
  const body = scene.children.map((shape) => element(shape, styles)).join('\n');
  const defs = `<defs>${markers.plain.map((m) => markerElement(m, styles.markerSize)).join('')}${areaDefs(styles, areas, paint)}</defs>`;
  return `${head}<title>${title}</title>${style}${defs}\n${body}\n</svg>\n`;
}

/** A marker reference, to the area's copy of the marker inside a group of an area. */
const markerRef = (attribute: string, id: string | undefined, tone: AreaTone | undefined): string =>
  id === undefined ? '' : ` ${attribute}="url(#m-${id}${tone === undefined ? '' : `-${tone}`})"`;

function element(shape: Shape, styles: Styles, tone?: AreaTone): string {
  const cls = (role: string) => `class="${classesOf(role, styles).join(' ')}"`;
  switch (shape.kind) {
    case 'rect':
      return `<rect x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.w)}" height="${num(shape.h)}"${shape.rx ? ` rx="${shape.rx}"` : ''} ${cls(shape.role)}/>`;
    case 'path': {
      const { marker, markerStart } = styles.roles[shape.role] ?? {};
      const ends = markerRef('marker-end', marker, tone) + markerRef('marker-start', markerStart, tone);
      const move = shape.offset ? ` transform="translate(${shape.offset[0]} ${shape.offset[1]})"` : '';
      return `<path d="${shape.d}" ${cls(shape.role)}${ends}${move}/>`;
    }
    case 'line':
      return `<line x1="${num(shape.x1)}" y1="${num(shape.y1)}" x2="${num(shape.x2)}" y2="${num(shape.y2)}" ${cls(shape.role)}/>`;
    case 'circle':
      return `<circle cx="${num(shape.cx)}" cy="${num(shape.cy)}" r="${shape.r}" ${cls(shape.role)}/>`;
    case 'text': {
      const anchor = shape.anchor ? ` text-anchor="${shape.anchor}"` : '';
      const { runs } = shape;
      const content = runs === undefined ? escapeText(shape.text) : runs.map((run) => runOf(run, cls)).join('');
      const space = runs !== undefined && LOST_SPACE.test(shape.text) ? ' xml:space="preserve"' : '';
      return `<text x="${num(shape.x)}" y="${num(shape.y)}"${anchor}${space} ${cls(shape.role)}>${content}</text>`;
    }
    case 'icon':
      return icon(shape, styles.icons?.[shape.icon], cls(shape.role));
    case 'group':
      return group(shape, styles, tone);
  }
}

/** A group with its id, the classes of its role and of its area; its paths end in the markers of its area. */
function group(shape: Extract<Shape, { kind: 'group' }>, styles: Styles, tone: AreaTone | undefined): string {
  const id = shape.id === undefined ? '' : ` id="${escapeText(shape.id)}"`;
  const classes = [
    ...(shape.role === undefined ? [] : classesOf(shape.role, styles)),
    ...(shape.area === undefined ? [] : [areaClass(shape.area)]),
  ];
  const role = classes.length === 0 ? '' : ` class="${classes.join(' ')}"`;
  const inner = shape.area?.tone ?? tone;
  return `<g${id}${role}>${shape.children.map((child) => element(child, styles, inner)).join('')}</g>`;
}

/** Whitespace that SVG would strip or collapse in a text unless it is told to keep it: at either end, or in a row. */
const LOST_SPACE = /^\s|\s$|\s\s|[^\S ]/;

/** A run as a `<tspan>` with the classes of its role, or as plain text in the role of its text. */
const runOf = (run: TextRun, cls: (role: string) => string): string =>
  run.role === undefined ? escapeText(run.text) : `<tspan ${cls(run.role)}>${escapeText(run.text)}</tspan>`;

function usedClasses(shapes: readonly Shape[], styles: Styles, into: Set<string> = new Set()): Set<string> {
  for (const shape of shapes) {
    if (shape.role !== undefined) for (const name of classesOf(shape.role, styles)) into.add(name);
    if (shape.kind === 'text')
      for (const run of shape.runs ?? []) for (const name of classesOf(run.role ?? shape.role, styles)) into.add(name);
    if (shape.kind === 'group') usedClasses(shape.children, styles, into);
  }
  return into;
}

function styleSheet(styles: Styles, used: ReadonlySet<string>): string {
  const root = `.${styles.root}`;
  const rules = styles.rules
    .filter((rule) => used.has(rule.name))
    .map((rule) => `  ${root} .${rule.name} { ${rule.declarations} }\n`);
  const kerning = styles.fontKerning === undefined ? '' : ` font-kerning: ${styles.fontKerning};`;
  return `\n  ${root} { font-family: ${styles.fontFamily}; font-size: ${styles.fontSize}px;${kerning} }\n${rules.join('')}`;
}

/** An icon as a nested `<svg>` scaled into its square. An icon without a table entry draws nothing (K102). */
function icon(shape: Extract<Shape, { kind: 'icon' }>, found: Icon | undefined, cls: string): string {
  if (found === undefined) return '';
  const { x, y, size } = shape;
  const paths = found.paths.map((d) => `<path d="${d}"/>`).join('');
  return `<svg x="${num(x)}" y="${num(y)}" width="${num(size)}" height="${num(size)}" viewBox="0 0 ${found.size} ${found.size}" ${cls}>${paths}</svg>`;
}
