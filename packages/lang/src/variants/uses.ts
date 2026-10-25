import { type Diagnostic, diagnostic } from '../diagnostic.js';
import { type LineContext, readLine } from '../grammar/read-line.js';
import type { KindSpec } from '../grammar/spec.js';
import { LANG_CODES } from '../messages.js';
import type { Span } from '../span.js';
import { read, type Statement } from '../tree.js';
import { diagnosticsIn, inFile } from './in-file.js';
import { resolvePath } from './path.js';
import { USE } from './tables.js';

/** How many files a chain of `use` may hold, the compiled file included, so a host never reads without end. */
const MAX_USE_CHAIN = 16;

/** A file a diagram needs to be read, by its path relative to the host's folder, and the place that asks for it. */
export interface Need {
  readonly path: string;
  readonly span: Span;
}

/** A variant block with whether it is the compiled file's own, which makes it a picture of that file. */
export interface VariantLine {
  readonly statement: Statement;
  readonly own: boolean;
}

/** A file with what `use` brought in: the base lines and variants in order, the files needed, and what was wrong. */
export interface Gathered {
  readonly base: Statement[];
  readonly variants: VariantLine[];
  readonly needs: Need[];
  readonly diagnostics: Diagnostic[];
}

/**
 * Collects the lines of a file after its header, with the lines of every file it uses before its own (ADR 0021).
 * `chain` holds the files on the way here, to find a file that uses itself.
 */
export function gather(
  kind: KindSpec,
  body: readonly Statement[],
  files: Readonly<Record<string, string>>,
  chain: readonly string[],
): Gathered {
  const out: Gathered = { base: [], variants: [], needs: [], diagnostics: [] };
  const own = chain.length === 1;
  const firstOther = body.find((s) => s.keyword !== 'use');
  for (const statement of body) {
    if (statement.keyword === 'variant') out.variants.push({ statement, own });
    else if (statement.keyword !== 'use') out.base.push(statement);
    else if (firstOther !== undefined && firstOther.line < statement.line) {
      const values = { found: firstOther.keyword, line: String(firstOther.line) };
      out.diagnostics.push(diagnostic(LANG_CODES.useFirst, 'error', statement.keywordSpan, values));
    } else useFile(kind, statement, files, chain, out);
  }
  return out;
}

function useFile(
  kind: KindSpec,
  statement: Statement,
  files: Readonly<Record<string, string>>,
  chain: readonly string[],
  out: Gathered,
): void {
  const context: LineContext = { diagnostics: [], references: [], declarations: [] };
  const input = { label: 'use', keyword: 'use', tokens: statement.arguments, line: statement.line };
  const values = readLine(USE, { ...input, start: statement.keywordSpan, attributes: statement.attributes }, context);
  out.diagnostics.push(...context.diagnostics);
  const written = values?.file as string | undefined;
  const span = statement.arguments[0]?.span ?? statement.keywordSpan;
  if (written === undefined) return;
  const problem = usedFile(kind, chain, written, files, out, span);
  if (problem !== undefined) out.diagnostics.push(diagnostic(problem.code, 'error', span, problem.values));
}

/** Reads one used file into `out`, or says why it cannot: a path not allowed, a cycle, a missing file, another kind. */
function usedFile(
  kind: KindSpec,
  chain: readonly string[],
  written: string,
  files: Readonly<Record<string, string>>,
  out: Gathered,
  span: Span,
): { code: string; values: Record<string, string> } | undefined {
  const resolved = resolvePath(chain.at(-1) ?? '', written);
  if ('problem' in resolved) {
    return { code: LANG_CODES.forbiddenPath, values: { found: written, case: resolved.problem } };
  }
  const { path } = resolved;
  if (chain.length >= MAX_USE_CHAIN) {
    return {
      code: LANG_CODES.useTooDeep,
      values: { file: path, depth: String(chain.length + 1), max: String(MAX_USE_CHAIN) },
    };
  }
  if (chain.includes(path)) {
    return { code: LANG_CODES.useCycle, values: { file: path, chain: [...chain, path].join(' → ') } };
  }
  out.needs.push({ path, span });
  const text = files[path];
  if (text === undefined) return { code: LANG_CODES.missingFile, values: { file: path } };
  const reading = read(text);
  const [header, ...body] = inFile(reading.document, path).statements;
  out.diagnostics.push(...diagnosticsIn(reading.diagnostics, path));
  const [name] = header?.keyword === 'diagram' ? header.arguments : [];
  if (name?.value !== kind.name) {
    return { code: LANG_CODES.useOtherKind, values: { file: path, found: name?.value ?? '?', kind: kind.name } };
  }
  const used = gather(kind, body, files, [...chain, path]);
  out.base.push(...used.base);
  out.variants.push(...used.variants);
  out.needs.push(...used.needs);
  out.diagnostics.push(...used.diagnostics);
  return undefined;
}
