import type { EdgeKind } from '../../grammar/edges.js';
import { STATUSES } from '../../grammar/elements.js';
import type { Metrics } from '../../layout/metrics.js';
import type { ColumnsSheetInput } from './sheet.js';
import { type SheetText, wrap } from './text.js';

const EDGE_ORDER: readonly EdgeKind[] = ['sync', 'async', 'dependency', 'data', 'link', 'duplex'];
/** Gap above the footer and its line height. */
const FOOTER = { gap: 40, line: 16, after: 28 } as const;

/** Pairs of what is seen and what it means; meanings of the same sight join with `/`. */
function joined(pairs: readonly (readonly [string, string])[]): string[] {
  const bySight = new Map<string, string[]>();
  for (const [sight, meaning] of pairs) {
    const meanings = bySight.get(sight) ?? [];
    if (!meanings.includes(meaning)) meanings.push(meaning);
    bySight.set(sight, meanings);
  }
  return [...bySight].map(([sight, meanings]) => `${sight}: ${meanings.join(' / ')}`);
}

/** The legend of `look=columns`: each sight the picture shows with its meaning, in the order of the standard legend. */
function legendOf(input: ColumnsSheetInput): string[] {
  const { model, words, texts, focus } = input;
  const kinds = new Set(model.edges.map((e) => e.kind));
  const nodes = model.nodes;
  const context = model.edges.some((e) => focus.edge(e)) || nodes.some((n) => focus.node(n.id));
  return [
    ...joined(EDGE_ORDER.filter((k) => kinds.has(k)).map((k) => [words.edges[k], texts.edges[k]] as const)),
    ...(context ? [`${words.context[0]}: ${words.context[1]}`] : []),
    ...(nodes.some((n) => n.emph) ? [`${words.emph}: ${texts.emph}`] : []),
    ...STATUSES.filter((s) => nodes.some((n) => n.status === s)).map((s) => `${words.status[s]}: ${texts.status[s]}`),
    ...(nodes.some((n) => n.replicas !== undefined) ? [`${words.replicas}: ${texts.replicas}`] : []),
  ];
}

/**
 * The footer below everything: title, kind and subtitle in one line of small capitals, the legend below it in the
 * second ink, both wrapped to `width`.
 */
export function footerOf(
  input: ColumnsSheetInput,
  at: { readonly x: number; readonly top: number; readonly width: number },
  m: Metrics,
): { texts: SheetText[]; bottom: number } {
  const { model, texts } = input;
  const kind = model.label ?? texts.kinds[model.level];
  const head = [model.title, kind, model.subtitle].filter(Boolean).join(' · ').toUpperCase();
  const legend = legendOf(input).join(' · ').toUpperCase();
  const font = m.fonts.group;
  const out: SheetText[] = [];
  let y = at.top + FOOTER.gap;
  for (const [text, role] of [
    [head, 'footerTitle'],
    [legend, 'footer'],
  ] as const)
    for (const line of text ? wrap(text, at.width, font) : []) {
      out.push({ x: at.x, y, text: line, role, font: 'group' });
      y += FOOTER.line;
    }
  return { texts: out, bottom: y - FOOTER.line + FOOTER.after };
}
