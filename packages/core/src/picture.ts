import {
  type Diagnostic,
  diagnostic,
  type Infer,
  type Locale,
  list,
  type Picture,
  type StatementSpec,
} from '@diagrist/lang';
import type { Anchors } from './anchors.js';
import { checkAreas } from './areas/check.js';
import type { CompileOptions } from './compile.js';
import { checkDrawing } from './drawing.js';
import { linesOfDrawing } from './lines/drawing.js';
import { type LineMetrics, lineMetrics } from './lines/metrics.js';
import { KERNEL_CODES } from './messages.js';
import type { Kind } from './plugin.js';
import type { Scene } from './scene.js';
import type { Styles } from './styles.js';
import { toSvg } from './svg.js';
import { applyTheme } from './theme.js';

/** One picture of a source: the base or a variant, with what was drawn of it when it has no error. */
export interface DrawnPicture {
  /** The id of the variant; absent for the base picture. */
  readonly variant?: string;
  readonly svg?: string;
  readonly anchors?: Anchors;
  readonly description?: string;
  /** The soft measures of its lines, such as crossings, bends and length, so a host can compare layouts (ADR 0035). */
  readonly metrics?: LineMetrics;
  /**
   * The scene the SVG was written from, present exactly with `svg`, so an exporter that builds native objects of
   * another tool (such as FigJam shapes and connectors) reads geometry and texts as data instead of parsing the SVG.
   */
  readonly scene?: Scene;
  /**
   * The style table the SVG was written with, the theme of the compile options already laid over it; present
   * exactly with `svg`. Exporters read colours, strokes, fonts and arrowheads of the scene's roles from it.
   */
  readonly styles?: Styles;
}

/** What a picture is drawn with besides its reading. */
export interface PictureContext {
  readonly locale: Locale;
  /** Whether the file has an error of its own, so no picture is drawn and only the readings are checked. */
  readonly blocked: boolean;
  /** The kinds that draw diff pictures, for K103. */
  readonly withDiff: readonly string[];
  readonly options: CompileOptions;
}

/**
 * Draws one picture: the kind's model of its reading, its rules, the layout, the kernel's checks of the drawing and
 * the SVG. It stops at the first stage with an error; the findings up to there are returned.
 */
export function drawPicture(
  kind: Kind,
  picture: Picture<Infer<StatementSpec>>,
  context: PictureContext,
): DrawnPicture & { readonly diagnostics: readonly Diagnostic[] } {
  const named = picture.variant === undefined ? {} : { variant: picture.variant };
  const found: Diagnostic[] = [...picture.reading.diagnostics, ...checkAreas(picture.reading.statements)];
  if (picture.diff !== undefined && kind.diff !== true) {
    const values = { kind: kind.spec.name, variant: picture.variant ?? '', allowed: list(context.withDiff) };
    found.push(diagnostic(KERNEL_CODES.noDiff, 'error', picture.diff, values));
  }
  if (context.blocked || hasErrors(found)) return { ...named, diagnostics: found };
  const model = kind.model(picture.reading);
  const checked = [...found, ...runRules(kind, model)];
  if (hasErrors(checked)) return { ...named, diagnostics: checked };
  const drawing = kind.layout(model, { locale: context.locale });
  const styles = applyTheme(drawing.styles, context.options.theme);
  const drawn = [...checked, ...checkDrawing(drawing, styles, kind.lineCheck)];
  if (hasErrors(drawn)) return { ...named, diagnostics: drawn };
  return {
    ...named,
    diagnostics: drawn,
    svg: toSvg(drawing.scene, styles, context.options.inline === true ? { inline: true } : {}),
    anchors: drawing.anchors,
    scene: drawing.scene,
    styles,
    metrics: lineMetrics(linesOfDrawing(drawing)),
    description: kind.describe(model, { locale: context.locale }),
  };
}

function runRules(kind: Kind, model: unknown): Diagnostic[] {
  return kind.rules.flatMap((rule) =>
    rule.check(model).map((finding) => diagnostic(rule.code, rule.severity, finding.span, { ...finding.values })),
  );
}

const hasErrors = (diagnostics: readonly Diagnostic[]): boolean => diagnostics.some((d) => d.severity === 'error');
