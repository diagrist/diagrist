export type { Anchors, EdgeAnchor, NodeAnchor } from './anchors.js';
export { domId } from './anchors.js';
export type { AreaStatementSpec } from './areas/grammar.js';
export { AREA_STATEMENT, areaAttribute, areasAttribute, lineAreaAttribute } from './areas/grammar.js';
export { markAreas } from './areas/mark.js';
export type { Area, Areas } from './areas/model.js';
export { areaMark, lineArea, readAreas } from './areas/model.js';
export type { AreaMark, AreaPaint, AreaTone } from './areas/tones.js';
export { checkPlugin } from './check.js';
export type { Compilation, CompileOptions } from './compile.js';
export { compile, localeAttribute } from './compile.js';
export type { Point, Rect } from './geometry.js';
export { bundleLines, linesOfDrawing } from './lines/drawing.js';
export { lineFindings } from './lines/index.js';
export { type LineCentring, type LineMetrics, lineCentring, lineMetrics } from './lines/metrics.js';
export type { LineCheck } from './lines/report.js';
export {
  DEFAULT_THRESHOLDS,
  LINE_RULES,
  type LineFinding,
  type LineFrame,
  type LineInput,
  type LineLabel,
  type LineNode,
  type LineRoute,
  type LineRule,
  type LineText,
  type LineThresholds,
} from './lines/types.js';
export { formatMessage, KERNEL_CODES, pick } from './messages.js';
export type { DrawnPicture } from './picture.js';
export type { Placed } from './placement.js';
export { checkPlacement } from './placement.js';
export type { Catalogue, Drawing, Finding, Kind, KindContext, Plugin, Rule } from './plugin.js';
export { defineKind, definePlugin } from './plugin.js';
export type { Scene, Shape, TextRun } from './scene.js';
export { segmentMeetsEllipse, segmentMeetsRect, segmentsIntersect } from './segment.js';
export type { Tone } from './standard/palette.js';
export { COLORS, DASH, FONT_SIZE, STROKES, TONE_NAMES, TONES } from './standard/palette.js';
export type { KindStyles, StandardMeasures } from './standard/styles.js';
export { rule, STANDARD_FONTS, standardStyles, textRule } from './standard/styles.js';
export type { Icon, Marker, MarkerShape, RoleStyle, StyleRule, Styles } from './styles.js';
export { MARKER_SHAPES } from './styles.js';
export type { SvgOptions } from './svg.js';
export { toSvg } from './svg.js';
export type { Font, Typeface } from './text.js';
export { FONT_STACKS, runsWidth, textWidth } from './text.js';
export type { Theme } from './theme.js';
