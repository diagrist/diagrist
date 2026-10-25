import { xmlSafe } from '@diagrist/lang';
import type { Scene, Shape, TextRun } from './scene.js';
import type { Icon, Marker, Styles } from './styles.js';

/** How `toSvg` writes the document. */
export interface SvgOptions {
  /** Leave out stylesheet and background, for hosts that style the classes themselves. */
  readonly inline?: boolean;
}

/** Text as XML content or attribute value: markup escaped, and what XML cannot hold replaced, so the SVG always parses. */
const escapeText = (text: string): string =>
  xmlSafe(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Coordinates of rectangles, lines and texts: integers as they are, others with one decimal. */
const num = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

/**
 * Writes a scene as a standalone SVG document. The output is part of the public contract: ids from `domId`
 * on groups, `marker-end="url(#m-<id>)"` on paths, every marker in `<defs>`, one shape per line.
 */
export function toSvg(scene: Scene, styles: Styles, options: SvgOptions = {}): string {
  const { width, height } = scene;
  const title = escapeText(scene.title);
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="${styles.root}" role="img" aria-label="${title}">`;
  const style =
    options.inline === true
      ? ''
      : `<style>${styleSheet(styles, usedClasses(scene.children, styles))}</style><rect width="${width}" height="${height}" fill="${styles.canvas}"/>`;
  const body = scene.children.map((shape) => element(shape, styles)).join('\n');
  return `${head}<title>${title}</title>${style}${markers(styles)}\n${body}\n</svg>\n`;
}

function classesOf(role: string, styles: Styles): readonly string[] {
  return styles.roles[role]?.classes ?? [role];
}

/** The inline paint of a role, with its leading space; empty for roles styled by class alone. */
const paintOf = (role: string, styles: Styles): string => {
  const paint = styles.roles[role]?.paint;
  return paint === undefined ? '' : ` ${paint}`;
};

function element(shape: Shape, styles: Styles): string {
  const cls = (role: string) => `class="${classesOf(role, styles).join(' ')}"${paintOf(role, styles)}`;
  switch (shape.kind) {
    case 'rect':
      return `<rect x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.w)}" height="${num(shape.h)}"${shape.rx ? ` rx="${shape.rx}"` : ''} ${cls(shape.role)}/>`;
    case 'path': {
      const { marker, markerStart } = styles.roles[shape.role] ?? {};
      const end = marker === undefined ? '' : ` marker-end="url(#m-${marker})"`;
      const start = markerStart === undefined ? '' : ` marker-start="url(#m-${markerStart})"`;
      const move = shape.offset ? ` transform="translate(${shape.offset[0]} ${shape.offset[1]})"` : '';
      return `<path d="${shape.d}" ${cls(shape.role)}${end}${start}${move}/>`;
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
      return icon(shape, styles.icons?.[shape.icon], cls(shape.role), paintOf(shape.role, styles));
    case 'group': {
      const id = shape.id === undefined ? '' : ` id="${escapeText(shape.id)}"`;
      const role = shape.role === undefined ? '' : ` ${cls(shape.role)}`;
      return `<g${id}${role}>${shape.children.map((child) => element(child, styles)).join('')}</g>`;
    }
  }
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
    .filter((rule) => rule.always === true || used.has(rule.name))
    .map((rule) => `  ${root} .${rule.name} { ${rule.declarations} }\n`);
  const kerning = styles.fontKerning === undefined ? '' : ` font-kerning: ${styles.fontKerning};`;
  return `\n  ${root} { font-family: ${styles.fontFamily}; font-size: ${styles.fontSize}px;${kerning} }\n${rules.join('')}`;
}

/**
 * An icon as a nested `<svg>` scaled into its square; an icon with the predecessor's `markup` as its `<g transform>`
 * with the role's paint. An icon without a table entry draws nothing (K102).
 */
function icon(shape: Extract<Shape, { kind: 'icon' }>, found: Icon | undefined, cls: string, paint: string): string {
  if (found === undefined) return '';
  const { x, y, size } = shape;
  if (found.markup !== undefined)
    return `<g transform="translate(${num(x)} ${num(y)}) scale(${num(size / found.size)})"${paint} data-icon="${escapeText(shape.icon)}">${found.markup}</g>`;
  const paths = found.paths.map((d) => `<path d="${d}"/>`).join('');
  return `<svg x="${num(x)}" y="${num(y)}" width="${num(size)}" height="${num(size)}" viewBox="0 0 ${found.size} ${found.size}" ${cls}>${paths}</svg>`;
}

/** Markers drawn in a grid of 12 units, scaled to `markerSize`. */
function markers(styles: Styles): string {
  const size = styles.markerSize;
  const unit = (n: number) => num((n * size) / 12);
  const outline = (m: Marker) =>
    m.shape.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${unit(x)} ${unit(y)}`).join(' ') +
    (m.shape.closed === true ? ' Z' : '');
  const marker = (m: Marker) =>
    `<marker id="m-${m.id}" markerUnits="userSpaceOnUse" markerWidth="${size}" markerHeight="${size}" refX="${unit(11)}" refY="${unit(6)}" orient="${m.orient ?? 'auto'}"><path d="${outline(m)}" class="${m.name}" stroke-linecap="round"/></marker>`;
  return `<defs>${styles.markers.map(marker).join('')}</defs>`;
}
