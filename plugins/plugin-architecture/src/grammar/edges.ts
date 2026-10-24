import { TONE_NAMES } from '@diagrist/core';
import { arg, arrow, attr, id, lines, oneOf, optionalArg, ref, statement, text, word } from '@diagrist/lang';
import { LEVEL_ELEMENTS, type Level } from './elements.js';
import { gridName } from './values.js';

/**
 * The arrows of edges and flow steps: what each one means and which kind of edge the model makes of it. Grammar,
 * diagnostics, legend and description read this one table.
 */
export const ARROWS = {
  '->': { kind: 'sync', meaning: 'synchronous call (filled head)' },
  '~>': { kind: 'async', meaning: 'asynchronous message or event (dashed, open head)' },
  '-->': { kind: 'dependency', meaning: 'dependency (dashed, open head)' },
  '=>': { kind: 'data', meaning: 'data flow (thick line, filled head)' },
  '--': { kind: 'link', meaning: 'connection without direction (no head)' },
  '<->': { kind: 'duplex', meaning: 'call in both directions (a head at each end)' },
} as const;

type Arrow = keyof typeof ARROWS;

/** The kind of an edge, named after what its arrow means. */
export type EdgeKind = (typeof ARROWS)[Arrow]['kind'];

const MEANINGS = Object.fromEntries(Object.entries(ARROWS).map(([a, { meaning }]) => [a, meaning])) as Readonly<
  Record<Arrow, string>
>;

const ATTRIBUTES = {
  via: attr(text(), 'Protocol or transport, such as `HTTPS`; second line of the label.'),
  schedule: attr(text(), 'When it runs, such as `"nightly 02:00"`; joins the second line.'),
  volume: attr(text(), 'How much, such as `"10k/day"`; joins the second line.'),
  sla: attr(text(), 'What is promised, such as `"< 200 ms"`; joins the second line.'),
  mark: attr(ref('adr'), 'Id of a decision of the bar below, such as `E1`; the mark stands near the end.'),
  bundle: attr(word(), 'Edges with the same bundle and a shared end share one trunk; needs `layout=adaptive`.'),
  lane: attr(gridName(), 'Column a vertical edge runs in, reaching into frames at its ends; needs `layout=adaptive`.'),
  tone: attr(oneOf(TONE_NAMES), 'Colour of line and heads, such as `red` for a highlighted way.'),
  style: attr(ref('style'), 'A `style` whose `tone` applies when the edge sets none.'),
};

/** Arguments of an edge between two elements or groups of the level. */
function ends(level: Level) {
  const end = ref(...LEVEL_ELEMENTS[level], 'group');
  return [
    arg('from', end, 'Where it starts: an element or a group.'),
    arg('arrow', arrow(MEANINGS), 'The kind of edge, which also decides how it is drawn.'),
    arg('to', end, 'Where it ends: an element or a group.'),
    optionalArg('label', text(), 'What happens, such as `"reads documents"`; first line of the label.'),
  ] as const;
}

/** `edge` and `flow` of a level; their ends name the elements the level allows. */
export function edgeTables(level: Level) {
  const step = lines({
    doc: 'A step of the flow: an edge without keyword, numbered after the steps before it, across all flows.',
    examples: ['kafka ~> importer "consume event"', 'storage -> bucket "read object" via="S3 HEAD"'],
    arguments: ends(level),
    attributes: ATTRIBUTES,
  });
  const flow = statement('flow', {
    doc: 'A numbered path: its steps are indented below it. Numbers run on across all flows in source order.',
    examples: ['flow import primary'],
    arguments: [arg('id', id(), 'Name of the flow, shown in the legend.')],
    flags: {
      primary: 'Draws the steps in the line colour (default).',
      accent: 'Draws the steps, their labels and numbers in the accent colour.',
    },
    lines: step,
  });
  const edge = statement('edge', {
    doc: 'An edge outside of flows, without number. Its ends may be groups too.',
    examples: ['edge abgleich => db "check inventory" schedule="daily 03:00"', 'edge web -> gateway via=HTTPS'],
    arguments: ends(level),
    attributes: ATTRIBUTES,
  });
  return { edge, flow };
}
