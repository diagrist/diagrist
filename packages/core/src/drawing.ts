import { type Diagnostic, diagnostic, list } from '@diagrist/lang';
import { type LineCheck, lineDiagnostics } from './lines/report.js';
import { KERNEL_CODES } from './messages.js';
import { checkPlacement } from './placement.js';
import type { Drawing } from './plugin.js';
import type { Shape } from './scene.js';
import type { Styles } from './styles.js';

const NOWHERE = { line: 1, column: 1, length: 1 } as const;

/**
 * Checks what a layout handed over before it is written: every icon of the scene has an entry in the style table
 * (K102, an icon without one would silently draw nothing), the runs of every text join to its text (K104, else the
 * picture would show another line than the one placed and described), the placed rectangles pass the placement
 * check, and the lines pass the line check as far as the kind takes part in it (`lineCheck`).
 */
export function checkDrawing(drawing: Drawing, styles: Styles, lineCheck?: LineCheck): Diagnostic[] {
  const known = Object.keys(styles.icons ?? {});
  const missing = [...new Set(icons(drawing.scene.children))].filter((name) => !known.includes(name));
  return [
    ...missing.map((icon) => diagnostic(KERNEL_CODES.unknownIcon, 'error', NOWHERE, { icon, known: list(known) })),
    ...splitTexts(drawing.scene.children).map((values) => diagnostic(KERNEL_CODES.runs, 'error', NOWHERE, values)),
    ...checkPlacement(drawing.placed ?? [], drawing.scene),
    ...lineDiagnostics(drawing, lineCheck),
  ];
}

/** Texts whose runs say another line than the text itself, with both. */
function splitTexts(shapes: readonly Shape[]): { text: string; runs: string }[] {
  return shapes.flatMap((shape) => {
    if (shape.kind === 'group') return splitTexts(shape.children);
    if (shape.kind !== 'text' || shape.runs === undefined) return [];
    const runs = shape.runs.map((run) => run.text).join('');
    return runs === shape.text ? [] : [{ text: shape.text, runs }];
  });
}

function icons(shapes: readonly Shape[]): string[] {
  return shapes.flatMap((shape) => {
    if (shape.kind === 'icon') return [shape.icon];
    return shape.kind === 'group' ? icons(shape.children) : [];
  });
}
