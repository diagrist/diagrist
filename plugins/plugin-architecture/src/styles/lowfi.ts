import { type RoleStyle, rule, STROKES, type StyleRule, textRule } from '@diagrist/core';
import type { LookFonts, Paint } from '../looks/look.js';
import { iconRules, type Strokes, standardChanges } from './rules.js';

const LOWFI_STROKES: Strokes = { ...STROKES, line: 1.5, accent: 2, data: 2.5, shape: 1.5, emph: 2.5, frame: 1 };

/**
 * The colours of a concept report: white ground and ink, a grey for second lines and edge texts, a grey fill only for
 * what exists, so frames stay unfilled, one blue accent, red only for warnings.
 */
const LOWFI = {
  ground: '#ffffff',
  ink: '#222222',
  ink2: '#555555',
  rule: '#bbbbbb',
  existing: '#e8e8e8',
  accent: '#2563eb',
  bad: '#b91c1c',
} as const;

const r = (...classes: string[]): RoleStyle => ({ classes });

/**
 * Roles drawn differently from the standard look: what exists in grey, planned and optional boxes dashed, shared and
 * deprecated boxes muted, second lines and edge texts in the second ink, the sheet's sentences and margin notes.
 */
const LOWFI_ROLES: Readonly<Record<string, RoleStyle>> = {
  boxOptional: r('shape-planned'),
  description: r('label-note'),
  tech: r('label-note'),
  edgeLabel: r('label-edge', 'halo'),
  edgeDetail: r('label-edge', 'halo'),
  edgeLabelBare: r('label-edge'),
  edgeDetailBare: r('label-edge'),
  labelGap: r('gap'),
  labelGapZone: r('gap-zone'),
  legendRule: r('hairline'),
  legendText: r('margin-text'),
  marginRule: r('hairline'),
  marginId: r('margin-id'),
  marginText: r('margin-text'),
  marginChoice: r('margin-choice'),
};

/** The rules of `look=lowfi`; a rule with the name of a standard one replaces it, the rest are its own. */
function lowfiRules(f: LookFonts, w: Strokes): StyleRule[] {
  const c = LOWFI;
  const line = (color: string, width: number) => `fill: none; stroke: ${color}; stroke-width: ${width};`;
  return [
    ...iconRules({ ink: c.ink, muted: c.ink2, white: c.ground }, 1.6, 'round'),
    rule('shape', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: ${w.shape};`),
    rule('shape-muted', `fill: ${c.ground}; stroke: ${c.ink2}; stroke-width: ${w.shape};`),
    rule('shape-emph', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: ${w.emph};`),
    rule('shape-planned', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: ${w.shape}; stroke-dasharray: 5 3;`),
    rule('shape-existing', `fill: ${c.existing}; stroke: ${c.ink}; stroke-width: ${w.shape};`),
    rule('shape-deprecated', `fill: ${c.ground}; stroke: ${c.rule}; stroke-width: ${w.shape};`),
    rule('frame', `fill: none; stroke: ${c.rule}; stroke-width: ${w.frame}; stroke-dasharray: 4 3;`),
    rule('frame-own', `fill: none; stroke: ${c.rule}; stroke-width: ${w.frame};`),
    rule('line', line(c.ink, w.line)),
    rule('line-accent', line(c.accent, w.accent)),
    rule('line-data', line(c.ink, w.data)),
    rule('line-data-accent', line(c.accent, w.data)),
    rule('line-deprecated', line(c.rule, w.line)),
    rule('dashed', 'stroke-dasharray: 4 3;'),
    rule('arrow-open', line(c.ink, w.line)),
    rule('arrow-filled', `fill: ${c.ink}; stroke: none;`),
    rule('halo', `paint-order: stroke; stroke: ${c.ground}; stroke-width: 4px; stroke-linejoin: round;`),
    rule('label', textRule(`fill: ${c.ink};`, f.label)),
    rule('label-edge', textRule(`fill: ${c.ink2};`, f.label)),
    rule('label-bold', textRule(`fill: ${c.ink};`, f.name)),
    rule('label-deprecated', textRule(`fill: ${c.ink2};`, f.name)),
    rule('label-title', textRule(`fill: ${c.ink};`, f.title)),
    rule('label-group', textRule(`fill: ${c.ink2};`, f.group)),
    rule('label-note', textRule(`fill: ${c.ink2};`, f.note)),
    rule('label-entry', textRule(`fill: ${c.ink};`, f.description)),
    rule('note-box', `fill: ${c.ground}; stroke: ${c.ink2}; stroke-width: 1; stroke-dasharray: 4 3;`),
    rule('note-tail', `fill: none; stroke: ${c.ink2}; stroke-width: 1; stroke-dasharray: 4 3;`),
    rule('note-box-red', `fill: ${c.ground}; stroke: ${c.bad}; stroke-width: 1; stroke-dasharray: 4 3;`),
    rule('note-tail-red', `fill: none; stroke: ${c.bad}; stroke-width: 1; stroke-dasharray: 4 3;`),
    rule('note-text-red', textRule(`fill: ${c.bad};`, f.note)),
    rule('badge', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: 1;`),
    rule('badge-text', textRule(`fill: ${c.ink};`, f.badge)),
    rule('mark', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: 1;`),
    rule('mark-text', textRule(`fill: ${c.ink};`, f.mark)),
    rule('gap', `fill: ${c.ground}; stroke: none;`),
    rule('gap-zone', `fill: ${c.ground}; stroke: none;`),
    rule('hairline', line(c.rule, 1)),
    rule('margin-id', textRule(`fill: ${c.ink};`, { ...f.label, weight: 600 })),
    rule('margin-text', textRule(`fill: ${c.ink2};`, f.label)),
    rule('margin-choice', textRule(`fill: ${c.ink};`, f.label)),
  ];
}

/**
 * The paint of `look=lowfi`: its roles and rules over the C4 table of the standard look, the root in unkerned Inter
 * (ADR 0022) on white, the standard heads at the look's small size, a diff picture as the standard look draws it.
 */
export const LOWFI_PAINT: Paint = {
  strokes: LOWFI_STROKES,
  areaColors: { ink: [LOWFI.ink], outline: [LOWFI.ink, LOWFI.ink2], surface: [LOWFI.ground, LOWFI.existing] },
  roles: LOWFI_ROLES,
  rules: lowfiRules,
  changes: standardChanges,
  root: 'note',
  fontKerning: 'none',
  canvas: LOWFI.ground,
  sights: {
    en: {
      emph: 'Heavy outline',
      roles: { own: 'Solid frame', shared: 'Dashed frame', external: 'Dashed frame' },
      status: {
        planned: 'Dashed',
        optional: 'Dashed',
        existing: 'Grey',
        new: 'White',
        deprecated: 'Grey text',
      },
    },
    de: {
      emph: 'Kräftiger Rand',
      roles: { own: 'Durchgezogener Rahmen', shared: 'Gestrichelter Rahmen', external: 'Gestrichelter Rahmen' },
      status: {
        planned: 'Gestrichelt',
        optional: 'Gestrichelt',
        existing: 'Grau',
        new: 'Weiß',
        deprecated: 'Graue Schrift',
      },
    },
  },
};
