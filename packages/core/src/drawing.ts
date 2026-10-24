import { type Diagnostic, diagnostic, list } from '@diagrist/lang';
import { KERNEL_CODES } from './messages.js';
import { checkPlacement } from './placement.js';
import type { Drawing } from './plugin.js';
import type { Shape } from './scene.js';
import type { Styles } from './styles.js';

const NOWHERE = { line: 1, column: 1, length: 1 } as const;

/**
 * Checks what a layout handed over before it is written: every icon of the scene has an entry in the style table
 * (K102, an icon without one would silently draw nothing), and the placed rectangles pass the placement check.
 */
export function checkDrawing(drawing: Drawing, styles: Styles): Diagnostic[] {
  const known = Object.keys(styles.icons ?? {});
  const missing = [...new Set(icons(drawing.scene.children))].filter((name) => !known.includes(name));
  return [
    ...missing.map((icon) => diagnostic(KERNEL_CODES.unknownIcon, 'error', NOWHERE, { icon, known: list(known) })),
    ...checkPlacement(drawing.placed ?? [], drawing.scene),
  ];
}

function icons(shapes: readonly Shape[]): string[] {
  return shapes.flatMap((shape) => {
    if (shape.kind === 'icon') return [shape.icon];
    return shape.kind === 'group' ? icons(shape.children) : [];
  });
}
