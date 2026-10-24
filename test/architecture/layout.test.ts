import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { keywordsOf, pluginsByPackage } from './plugins.js';
import { type Comment, lineOf, manifest, nodes, packageOf, parse, sourceFiles } from './source.js';

/**
 * The kernel, the shared parts and the layout libraries serve every kind and therefore know none (ADR 0010, 0014,
 * 0015): no string and no TSDoc in their source names a diagram kind or one of its elements. A kind that needs
 * something of them describes it as data (a shape, an own size, a pad), not by its name. The words are those of the
 * registered kinds: each kind's name and the keywords of its tables, plus the elements that have no keyword of their
 * own. Identifiers are not read, since `state`, `queue` or `partition` are also plain words of a program.
 */
const NEUTRAL = /^packages\/(core|parts|layout-[^/]+)\/src\//;

/** Elements of the kinds that their tables name without a keyword of their own. */
const ELEMENTS = ['lifeline', 'swimlane', 'transition', 'pseudostate', 'generalization', 'composition', 'aggregation'];

/**
 * Keywords of the tables that are also the neutral packages' own words or plain English, so they say nothing about a
 * kind there: the scene's nodes, edges, frames, groups, notes and styles, the grid's layers and flows, the decision
 * bar that `parts` draws for every kind with its `adr` table, the CSS class, the alt text of a picture, a package of
 * npm, the queue of a path search, the `and` and `else` of a sentence, and the like.
 */
const GENERAL = new Set([
  'adr',
  'alt',
  'and',
  'break',
  'choice',
  'class',
  'context',
  'decision',
  'edge',
  'else',
  'final',
  'flow',
  'frame',
  'go',
  'grid',
  'group',
  'join',
  'layer',
  'loop',
  'merge',
  'node',
  'note',
  'object',
  'package',
  'queue',
  'ref',
  'style',
  'system',
  'time',
]);

const LIBRARIES = /^packages\/layout-[^/]+\/src\//;

describe('layout libraries', () => {
  const files = sourceFiles().filter((file) => LIBRARIES.test(file));

  it('depend on the kernel only', () => {
    const roots = [...new Set(files.map(packageOf))].filter((root) => root !== undefined);
    const offending = roots.flatMap((root) =>
      Object.keys(manifest(root).dependencies ?? {})
        .filter((name) => name !== '@diagrist/core')
        .map((name) => `${root} depends on ${name}`),
    );
    expect(offending).toEqual([]);
  });
});

describe('kernel, parts and layout libraries', () => {
  it('name no diagram kind and no element of one in their strings and TSDoc', () => {
    const words = kindWords();
    expect(words).toEqual(expect.arrayContaining(['sequence', 'participant', 'lifeline', 'region']));
    const offending = sourceFiles()
      .filter((file) => NEUTRAL.test(file))
      .flatMap((file) => kindWordsIn(file, parse(file), words));
    expect(offending).toEqual([]);
  });

  it('are found naming a kind or an element in a string, a template and TSDoc', () => {
    const source = [
      '/** Docks back edges of a state machine. */',
      "const a = 'participant';",
      `const b = \`\${a} on its lifeline\`;`,
      'const state = 1;',
    ].join('\n');
    const { program, comments } = parseSync('fake.ts', source);
    const parsed = { source, program, comments: comments as Comment[] };
    const found = kindWordsIn('fake.ts', parsed, ['state', 'participant', 'lifeline']);
    expect(found).toEqual([
      'fake.ts:1  state: Docks back edges of a state machine.',
      'fake.ts:2  participant: participant',
      'fake.ts:3  lifeline:  on its lifeline',
    ]);
  });
});

/** The words that name a kind or its elements: names and keywords of every registered kind, and `ELEMENTS`. */
function kindWords(): string[] {
  const kinds = [...pluginsByPackage.values()].flat().flatMap((plugin) => plugin.kinds);
  const words = [...kinds.flatMap((kind) => [kind.spec.name, ...keywordsOf(kind)]), ...ELEMENTS];
  return [...new Set(words)].filter((word) => !GENERAL.has(word)).sort();
}

/** Each string, template part and comment of a parsed file that holds one of `words`, case aside, by line. */
function kindWordsIn(
  file: string,
  { source, program, comments }: ReturnType<typeof parse>,
  words: readonly string[],
): string[] {
  const texts = [
    ...[...nodes(program)].flatMap((node) => {
      if (node.type === 'Literal' && typeof node.value === 'string') return [{ at: node.start, text: node.value }];
      if (node.type === 'TemplateElement') return [{ at: node.start, text: (node.value as { raw: string }).raw }];
      return [];
    }),
    ...comments.map((comment) => ({ at: comment.start, text: comment.value })),
  ];
  return texts
    .sort((a, b) => a.at - b.at)
    .flatMap(({ at, text }) => {
      const word = words.find((w) => new RegExp(`\\b${w}s?\\b`, 'i').test(text));
      const said = text
        .replace(/\s*\n\s*\*?\s*/g, ' ')
        .replace(/^\*\s*/, '')
        .trimEnd();
      return word === undefined ? [] : [`${file}:${lineOf(source, at)}  ${word}: ${said}`];
    });
}
