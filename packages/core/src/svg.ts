import type { Scene, Shape } from './scene.js';
import type { Marker, Styles } from './styles.js';

/** How `toSvg` writes the document. */
export interface SvgOptions {
  /** Leave out stylesheet and background, for hosts that style the classes themselves. */
  readonly inline?: boolean;
}

const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

function element(shape: Shape, styles: Styles): string {
  const cls = (role: string) => `class="${classesOf(role, styles).join(' ')}"`;
  switch (shape.kind) {
    case 'rect':
      return `<rect x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.w)}" height="${num(shape.h)}"${shape.rx ? ` rx="${shape.rx}"` : ''} ${cls(shape.role)}/>`;
    case 'path': {
      const marker = styles.roles[shape.role]?.marker;
      const end = marker === undefined ? '' : ` marker-end="url(#m-${marker})"`;
      const move = shape.offset ? ` transform="translate(${shape.offset[0]} ${shape.offset[1]})"` : '';
      return `<path d="${shape.d}" ${cls(shape.role)}${end}${move}/>`;
    }
    case 'line':
      return `<line x1="${num(shape.x1)}" y1="${num(shape.y1)}" x2="${num(shape.x2)}" y2="${num(shape.y2)}" ${cls(shape.role)}/>`;
    case 'circle':
      return `<circle cx="${num(shape.cx)}" cy="${num(shape.cy)}" r="${shape.r}" ${cls(shape.role)}/>`;
    case 'text': {
      const anchor = shape.anchor ? ` text-anchor="${shape.anchor}"` : '';
      return `<text x="${num(shape.x)}" y="${num(shape.y)}"${anchor} ${cls(shape.role)}>${escapeText(shape.text)}</text>`;
    }
    case 'group': {
      const id = shape.id === undefined ? '' : ` id="${escapeText(shape.id)}"`;
      const role = shape.role === undefined ? '' : ` ${cls(shape.role)}`;
      return `<g${id}${role}>${shape.children.map((child) => element(child, styles)).join('')}</g>`;
    }
  }
}

function usedClasses(shapes: readonly Shape[], styles: Styles, into: Set<string> = new Set()): Set<string> {
  for (const shape of shapes) {
    if (shape.role !== undefined) for (const name of classesOf(shape.role, styles)) into.add(name);
    if (shape.kind === 'group') usedClasses(shape.children, styles, into);
  }
  return into;
}

function styleSheet(styles: Styles, used: ReadonlySet<string>): string {
  const root = `.${styles.root}`;
  const rules = styles.rules
    .filter((rule) => rule.always === true || used.has(rule.name))
    .map((rule) => `  ${root} .${rule.name} { ${rule.declarations} }\n`);
  return `\n  ${root} { font-family: ${styles.fontFamily}; font-size: ${styles.fontSize}px; }\n${rules.join('')}`;
}

/** Arrowheads drawn in a grid of 12 units, scaled to `markerSize`. */
function markers(styles: Styles): string {
  const size = styles.markerSize;
  const unit = (n: number) => num((n * size) / 12);
  const marker = (m: Marker) =>
    `<marker id="m-${m.id}" markerUnits="userSpaceOnUse" markerWidth="${size}" markerHeight="${size}" refX="${unit(11)}" refY="${unit(6)}" orient="auto"><path d="M${unit(1)} ${unit(1)} L${unit(11)} ${unit(6)} L${unit(1)} ${unit(11)}${m.filled ? ' Z' : ''}" class="${m.name}" stroke-linecap="round"/></marker>`;
  return `<defs>${styles.markers.map(marker).join('')}</defs>`;
}
