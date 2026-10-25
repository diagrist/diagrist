import { attr, kind, read, text, unfold } from '../../src/index.js';
import { structure } from './kinds.js';

/** The structure kind with a subtitle in its header, as variants replace it. */
export const board = kind('board', {
  doc: 'Building blocks with a subtitle.',
  header: { subtitle: attr(text(), 'Second line of the title.') },
  statements: structure.statements,
});

/** A base picture: a group, three nodes and a flow between them. */
export const BASE = [
  'diagram board "Today" subtitle="as is"',
  'group shop "Shop"',
  'node a "A" in shop',
  'node b "B" in shop',
  'node c "C"',
  'flow f "Order"',
  '  a -> b "asks"',
  '  b -> c "stores"',
];

/** `lines` unfolded as the file `d/main.dgr`, with the texts of the files it uses. */
export const unfolded = (lines: readonly string[], files: Record<string, string> = {}, path = 'd/main.dgr') =>
  unfold(board, read(lines.join('\n')).document, { path, files });
/** The codes of every finding of the file and its pictures, in order. */
export const codes = (lines: readonly string[], files: Record<string, string> = {}) => {
  const result = unfolded(lines, files);
  return [...result.diagnostics, ...result.pictures.flatMap((p) => p.reading.diagnostics)].map((d) => d.code);
};
/** The reading of one picture, the first variant by default. */
export const picture = (lines: readonly string[], index = 1) => unfolded(lines).pictures[index]?.reading;
/** The top-level lines of a picture as `keyword id`. */
export const order = (lines: readonly string[], index = 1) =>
  picture(lines, index)?.statements.map((s) => `${s.keyword} ${'id' in s ? s.id : ''}`.trim());
