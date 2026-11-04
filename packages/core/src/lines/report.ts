import { type Diagnostic, diagnostic, type Span } from '@diagrist/lang';
import { LINE_CODES } from '../messages.js';
import type { Drawing } from '../plugin.js';
import { linesOfDrawing } from './drawing.js';
import { lineFindings } from './index.js';
import { DEFAULT_THRESHOLDS, type LineFinding, type LineThresholds } from './types.js';

/**
 * How a kind takes part in the line check: `false` keeps its lines out of it, thresholds tune the rules for a look
 * drawn smaller or larger than the standard one, and without it the defaults hold.
 */
export type LineCheck = false | Partial<LineThresholds>;

const NOWHERE: Span = { line: 1, column: 1, length: 1 };

/** The threshold a finding breached, as its message names it. */
function limitOf(f: LineFinding, t: LineThresholds): number | undefined {
  const value = f.value ?? 0;
  switch (f.rule) {
    case 'through':
      return t.clearance;
    case 'bends':
      return f.limit ?? t.bends;
    case 'lead':
      return t.lead;
    case 'tail':
      return t.tail;
    case 'jog':
      return value < t.jog ? t.jog : t.offset;
    case 'parallel':
      return t.parallel;
    case 'ports':
      return t.ports;
    case 'label':
      return f.detail === 'far' ? t.labelNear : t.labelClear;
    default:
      return undefined;
  }
}

/**
 * The line check of a drawing as warnings (G410 to G418, ADR 0035): each finding of `lineFindings` on what the kind
 * handed over, its lines named by their ends, at the source line of the first line it is about.
 */
export function lineDiagnostics(drawing: Pick<Drawing, 'anchors' | 'placed'>, check?: LineCheck): Diagnostic[] {
  if (check === false) return [];
  const t: LineThresholds = { ...DEFAULT_THRESHOLDS, ...check };
  const input = linesOfDrawing(drawing);
  const edges = new Map(drawing.anchors.edges.map((e) => [String(e.index), e]));
  const ownOf = new Map((input.labels ?? []).map((l) => [l.key, l.edge]));
  const named = (edge: string | undefined) => {
    const e = edges.get(edge ?? '');
    return e === undefined ? `#${edge}` : `\`${e.from}\` → \`${e.to}\``;
  };
  return lineFindings(input, t).map((f) => {
    const own = f.label === undefined ? f.edges[0] : (ownOf.get(f.label) ?? f.edges[0]);
    const other = f.edges.find((e) => e !== own);
    const limit = limitOf(f, t);
    const values: Record<string, string> = {
      line: named(own),
      ...(other === undefined ? {} : { other: named(other) }),
      ...(f.other === undefined ? {} : { key: f.other }),
      ...(f.detail === undefined ? {} : { case: f.detail }),
      ...(f.value === undefined ? {} : { value: String(f.value) }),
      ...(limit === undefined ? {} : { limit: String(limit) }),
    };
    return diagnostic(LINE_CODES[f.rule], 'warning', edges.get(own ?? '')?.span ?? NOWHERE, values);
  });
}
