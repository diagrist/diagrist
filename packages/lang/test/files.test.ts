import { describe, expect, it } from 'vitest';
import { arg, attr, checkKind, file, id, kind, lines, read, readKind, statement, text, unfold } from '../src/index.js';

const excerpt = statement('excerpt', {
  doc: 'A file shown as it is.',
  examples: ['excerpt order src="src/Order.java"'],
  arguments: [arg('id', id(), 'Id of the excerpt.')],
  attributes: { src: attr(file(), 'The file to show.') },
});

const listing = kind('listing', { doc: 'Files shown as they are.', statements: [excerpt] });

const unfolded = (source: string, files: Record<string, string> = {}, path = 'd/main.dgr') =>
  unfold(listing, read(source).document, { path, files });

const codes = (source: string, files: Record<string, string> = {}) => {
  const result = unfolded(source, files);
  return [...result.diagnostics, ...result.pictures.flatMap((p) => p.reading.diagnostics)].map((d) => d.code);
};

const head = 'diagram listing "Code"\n';

describe('file()', () => {
  it('gives the kind the text of the file, resolved against the diagram, and lists it as a need', () => {
    const result = unfolded(`${head}excerpt a src="../src/A.java"\n`, { 'src/A.java': 'class A {}\n' });
    const [picture] = result.pictures;
    expect(picture?.reading.diagnostics).toEqual([]);
    expect(picture?.reading.statements[0]?.attributes.src).toEqual({ path: 'src/A.java', text: 'class A {}\n' });
    expect(result.needs).toEqual([{ path: 'src/A.java', span: { line: 2, column: 11, length: 19 } }]);
  });

  it('reports a file not handed over (L118) and lists it, and a path not allowed (L119) without reading it', () => {
    expect(codes(`${head}excerpt a src="A.java"\n`)).toEqual(['L118']);
    expect(unfolded(`${head}excerpt a src="A.java"\n`).needs.map((n) => n.path)).toEqual(['d/A.java']);
    expect(codes(`${head}excerpt a src="/etc/passwd"\n`)).toEqual(['L119']);
    expect(codes(`${head}excerpt a src="../../x.java"\n`)).toEqual(['L119']);
    expect(codes(`${head}excerpt a src=".env"\n`)).toEqual(['L119']);
    expect(unfolded(`${head}excerpt a src=".env"\n`, { 'd/.env': 'SECRET=1' }).needs).toEqual([]);
  });

  it('resolves a path in a used file against that file, after the used files, each path once', () => {
    const files = {
      'base/base.dgr': `${head}excerpt a src="A.java"\n`,
      'base/A.java': 'class A {}',
      'd/B.java': 'class B {}',
    };
    const source = `${head}use "../base/base.dgr"\nexcerpt b src="B.java"\nvariant v "V" diff\n  excerpt c src="B.java"\n`;
    const result = unfolded(source, files);
    expect(codes(source, files)).toEqual([]);
    expect(result.needs.map((n) => n.path)).toEqual(['base/base.dgr', 'base/A.java', 'd/B.java']);
    expect(result.pictures[1]?.reading.statements.map((s) => s.attributes.src?.text)).toEqual([
      'class A {}',
      'class B {}',
      'class B {}',
    ]);
  });

  it('reads the file a variant sets, against the compiled file', () => {
    const source = `${head}excerpt a src="A.java"\nvariant v "V"\n  set a src="B.java"\n`;
    const result = unfolded(source, { 'd/A.java': 'class A {}', 'd/B.java': 'class B {}' });
    expect(result.needs.map((n) => n.path)).toEqual(['d/A.java', 'd/B.java']);
    expect(result.pictures.map((p) => p.reading.statements[0]?.attributes.src?.text)).toEqual([
      'class A {}',
      'class B {}',
    ]);
  });

  it('is read by readKind alone as well, so a kind never sees a file without its text', () => {
    const reading = readKind(listing, read(`${head}excerpt a src="A.java"\n`).document);
    expect(reading.diagnostics.map((d) => d.code)).toEqual(['L118']);
    expect(reading.statements).toEqual([]);
  });
});

describe('checkKind and reserved names', () => {
  it('accepts examples with files, which are not read, and arguments with names of their own', () => {
    expect(checkKind(listing)).toEqual([]);
  });

  it('rejects an argument named like a key every read line has, which reading would overwrite', () => {
    const shadowing = kind('shadowing', {
      doc: 'Arguments named like read values.',
      statements: [
        statement('cut', {
          doc: 'A cut.',
          examples: ['cut "1-4"'],
          arguments: [arg('lines', text(), 'Lines to keep.')],
          lines: lines({ doc: 'A mark.', examples: ['"x"'], arguments: [arg('span', text(), 'What is marked.')] }),
        }),
      ],
    });
    expect(checkKind(shadowing)).toEqual([
      'statement cut, argument lines takes a name reserved for the read values: line, span, origin, flags, clauses, attributes, keyword, children, lines',
      'line form of cut, argument span takes a name reserved for the read values: line, span, origin, flags, clauses, attributes',
    ]);
  });
});
