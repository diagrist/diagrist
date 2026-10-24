import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSync } from 'oxc-parser';

/** The repository root, so architecture tests work from any working directory. */
export const repository: string = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

/** Tracked and new source files, honouring .gitignore. */
export function sourceFiles(): string[] {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: repository,
    encoding: 'utf8',
  });
  return listed.split('\n').filter((file) => /\.(ts|mts|cts|js|mjs)$/.test(file) && !file.endsWith('.d.ts'));
}

export function readSource(file: string): string {
  return readFileSync(join(repository, file), 'utf8');
}

export function parse(file: string): { source: string; program: unknown; comments: Comment[] } {
  const source = readSource(file);
  const result = parseSync(file, source);
  return { source, program: result.program, comments: result.comments as Comment[] };
}

export interface Comment {
  readonly type: 'Line' | 'Block';
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

export interface Node {
  readonly type: string;
  readonly start: number;
  readonly [key: string]: unknown;
}

/** Every AST node below `root`, depth first. */
export function* nodes(root: unknown): Generator<Node> {
  if (Array.isArray(root)) {
    for (const item of root) yield* nodes(item);
    return;
  }
  if (root === null || typeof root !== 'object') return;
  if (typeof (root as Node).type === 'string') yield root as Node;
  for (const value of Object.values(root)) {
    if (value !== null && typeof value === 'object') yield* nodes(value);
  }
}

export function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split('\n').length;
}
