import { basename } from 'node:path';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { lineOf, type Node, nodes, parse, sourceFiles, statements } from './source.js';

/**
 * A look of C4 is a value with named options (ADR 0023): the layout and the scene read its options, never its name.
 * The name is read where the model is built and in the registry `src/looks/index.ts`, which turns it into the
 * value; every other file of `src/looks` besides the type in `look.ts` is one look, exporting one `Look`. The file
 * names are the names of the looks, which the plugin's tests hold against the registry.
 */
const SOURCE = 'plugins/plugin-architecture/src/';
const LOOKS = `${SOURCE}looks/`;
const BESIDE_LOOKS = new Set([`${LOOKS}index.ts`, `${LOOKS}look.ts`]);
const MAY_READ_THE_NAME = new Set([`${SOURCE}model/build.ts`]);

const lookFiles = (): string[] =>
  sourceFiles().filter((file) => file.startsWith(LOOKS) && !file.slice(LOOKS.length).includes('/'));

describe('looks of C4', () => {
  const looks = lookFiles().filter((file) => !BESIDE_LOOKS.has(file));
  const names = looks.map((file) => basename(file, '.ts'));

  it('each export one value, a Look', () => {
    expect(names).toEqual(expect.arrayContaining(['plain', 'paper']));
    const offending = looks.flatMap((file) => {
      const exported = exportsOf(parse(file).program);
      return exported.length === 1 && exported[0] === 'Look' ? [] : [`${file}: ${exported.join(', ') || 'nothing'}`];
    });
    expect(offending).toEqual([]);
  });

  it('are told apart by their options, nowhere by their name', () => {
    const offending = sourceFiles()
      .filter((file) => file.startsWith(SOURCE) && !file.startsWith(LOOKS) && !MAY_READ_THE_NAME.has(file))
      .flatMap((file) => {
        const { source, program } = parse(file);
        return namesReadIn(program, names).map((at) => `${file}:${lineOf(source, at.start)}  ${at.text}`);
      });
    expect(offending).toEqual([]);
  });

  it('are found read by name, as `model.look` or compared with the name of a look', () => {
    const source = [
      "if (model.look === 'blocks') draw();",
      "const paper = look !== 'paper';",
      "const box = form === 'card';",
    ];
    const { program } = parseSync('fake.ts', source.join('\n'));
    const found = namesReadIn(program, ['blocks', 'paper']).map((at) => at.text);
    expect(found).toEqual(["=== 'blocks'", 'model.look', "!== 'paper'"]);
  });

  it('are found exporting something besides their look', () => {
    const source = ['export const PLAIN: Look = {};', 'export const SIZE = 3;', 'export type Other = Look;'];
    const { program } = parseSync('fake.ts', source.join('\n'));
    expect(exportsOf(program)).toEqual(['Look', 'SIZE', 'Other']);
  });
});

/** Per exported declaration of a file the type of a typed constant, else its name. */
function exportsOf(program: unknown): string[] {
  return statements(program)
    .filter((s) => s.type === 'ExportNamedDeclaration' || s.type === 'ExportDefaultDeclaration')
    .flatMap((s) => {
      const declaration = s.declaration as Node | null;
      if (declaration?.type !== 'VariableDeclaration') return [nameOf(declaration) ?? 'a re-export'];
      return (declaration.declarations as Node[]).map((d) => {
        const id = d.id as Node & { typeAnnotation?: { typeAnnotation?: { typeName?: { name?: string } } } };
        return id.typeAnnotation?.typeAnnotation?.typeName?.name ?? nameOf(d) ?? 'a constant';
      });
    });
}

const nameOf = (node: Node | null): string | undefined => (node?.id as { name?: string } | undefined)?.name;

/** Where a file reads the name of a look: `model.look`, or a comparison with a string that is one of `names`. */
function namesReadIn(program: unknown, names: readonly string[]): { start: number; text: string }[] {
  return [...nodes(program)].flatMap((node) => {
    if (node.type === 'MemberExpression' && node.computed === false) {
      const object = node.object as Node;
      const property = node.property as Node;
      return object.type === 'Identifier' && object.name === 'model' && property.name === 'look'
        ? [{ start: node.start, text: 'model.look' }]
        : [];
    }
    if (node.type !== 'BinaryExpression' || !['===', '!==', '==', '!='].includes(node.operator as string)) return [];
    const named = [node.left, node.right].find(
      (side) => (side as Node).type === 'Literal' && names.includes((side as Node).value as string),
    ) as Node | undefined;
    return named ? [{ start: node.start, text: `${node.operator as string} '${named.value as string}'` }] : [];
  });
}
