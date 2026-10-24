import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { pluginsByPackage } from './plugins.js';
import { lineOf, type Node, nodes, packageOf, readSource, sourceFiles } from './source.js';

/**
 * A diagnostic code lives in its rule and its catalogue, nowhere else (ADR 0011): models, layout and docs name the
 * case, and the generated tables name the code. A plugin's codes are the keys of the catalogues of the plugin objects
 * it exports, as the kernel reads them; they may appear only in files below `rules` and `messages`, neither written
 * out, anywhere in the text, nor put together from pieces such as `` `U${n}` `` or `'U4' + n`. Codes of the language
 * such as L108, or the predecessor's such as W110, are no plugin's and may be mentioned.
 */
describe('diagnostic codes of a plugin', () => {
  const owns = (file: string) => /\/(rules|messages)\//.test(file);

  it('are written in their rule and their catalogue only', () => {
    expect(pluginsByPackage.get('plugins/plugin-uml')?.some((plugin) => 'U403' in plugin.messages)).toBe(true);
    const files = sourceFiles().filter((file) => /^plugins\/[^/]+\/src\//.test(file) && !owns(file));
    const offending = files.flatMap((file) => {
      const codes = (pluginsByPackage.get(packageOf(file) ?? '') ?? []).flatMap((plugin) =>
        Object.keys(plugin.messages),
      );
      return codesIn(file, readSource(file), codes);
    });
    expect(offending).toEqual([]);
  });

  it('are found written out, in a template and put together', () => {
    const source = [
      '/** Reported as U403. */',
      "const a = 'U403';",
      `const b = \`U\${400 + 3}\`;`,
      "const c = 'U4' + '03';",
      `const d = \`U40\${3}\`;`,
      "const e = 'L108';",
      `const f = \`M0 0 A\${5} 5 0 0 1 9 9\`;`,
    ].join('\n');
    expect(codesIn('fake.ts', source, ['U403'])).toEqual([
      'fake.ts:1  U403',
      'fake.ts:2  U403',
      'fake.ts:3  U${',
      "fake.ts:4  'U4' +",
      'fake.ts:5  U40${',
    ]);
  });
});

/**
 * Where a source names one of `codes`: every code as a word in the text, comments included, and every template or
 * sum that ends a part with the letter of a code and digits of its number and leaves the rest to an expression. A
 * letter without digits counts only as the whole part, as in `` `U${n}` ``, since SVG paths write `` ` A${r}` ``.
 */
function codesIn(file: string, source: string, codes: readonly string[]): string[] {
  const known = new Set(codes);
  const prefixes = new Set(codes.map((code) => code.slice(0, 1)));
  const partial = (text: string) => {
    const tail = /(?:^|[^A-Za-z0-9])([A-Z]\d{0,2})$/.exec(text)?.[1];
    const code = tail !== undefined && prefixes.has(tail.slice(0, 1)) && (tail.length > 1 || text === tail);
    return code ? tail : undefined;
  };
  const written = [...source.matchAll(/\b[A-Z]\d{3}\b/g)]
    .filter((match) => known.has(match[0]))
    .map((match) => ({ at: match.index, what: match[0] }));
  const built = [...nodes(parseSync(file, source).program)].flatMap((node) => pieces(node, partial));
  return [...written, ...built]
    .sort((a, b) => a.at - b.at)
    .map(({ at, what }) => `${file}:${lineOf(source, at)}  ${what}`);
}

/** A template part such as `U${` or a sum such as `'U4' +` that leaves the rest of a code to an expression. */
function pieces(node: Node, partial: (text: string) => string | undefined): { at: number; what: string }[] {
  if (node.type === 'TemplateLiteral') {
    return (node.quasis as Node[]).slice(0, -1).flatMap((quasi) => {
      const tail = partial((quasi.value as { raw: string }).raw);
      return tail === undefined ? [] : [{ at: quasi.start, what: `${tail}\${` }];
    });
  }
  const left = node.left as Node | undefined;
  if (node.type !== 'BinaryExpression' || node.operator !== '+' || left?.type !== 'Literal') return [];
  const tail = partial(String(left.value));
  return tail === undefined ? [] : [{ at: left.start, what: `'${tail}' +` }];
}
