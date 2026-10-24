import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  arg,
  attr,
  checkKind,
  formatDiagnostic,
  grammarOf,
  id as identifier,
  type KindSpec,
  kind,
  read,
  readKind,
  ref,
  type StatementSpec,
  statement,
  text,
} from '../src/index.js';
import { sequence, structure } from './fixtures/kinds.js';

const readAs = <S extends readonly StatementSpec[]>(spec: KindSpec<S>, ...source: string[]) =>
  readKind(spec, read(source.join('\n')).document);
const codes = (reading: { diagnostics: readonly { code: string }[] }) => reading.diagnostics.map((d) => d.code);

const login = [
  'diagram sequence "Login" numbering=on',
  'participant client "Browser" external',
  'participant api "API"',
  'alt "valid"',
  '  msg client -> api "POST /login"',
  '  else "invalid"',
  '    msg api --> client "401"',
];

describe('readKind', () => {
  it('reads a diagram into typed values derived from the tables', () => {
    const reading = readAs(sequence, ...login);
    expect(codes(reading)).toEqual([]);
    expect(reading.header).toMatchObject({ title: 'Login', attributes: { numbering: 'on' } });
    const [client, , alt] = reading.statements;
    expect(client).toMatchObject({ keyword: 'participant', id: 'client', label: 'Browser', flags: { external: true } });
    expect(alt?.children.map((c) => c.keyword)).toEqual(['msg', 'else']);

    const message = reading.statements.find((s) => s.keyword === 'msg');
    if (message?.keyword === 'msg') expectTypeOf(message.arrow).toEqualTypeOf<'->' | '-->'>();
  });

  it('reads lines without a keyword through the line form of their block', () => {
    const reading = readAs(
      structure,
      'diagram structure "Shop"',
      'node client "Client"',
      'node api "API"',
      'flow checkout "Checkout"',
      '  client -> api "places the order"',
      'class ticket "Ticket" abstract',
      '  "- number : Integer"',
      '  "+ total() : Money" abstract',
    );
    expect(codes(reading)).toEqual([]);
    const flow = reading.statements.find((s) => s.keyword === 'flow');
    expect(flow?.lines).toMatchObject([{ from: 'client', arrow: '->', to: 'api', label: 'places the order' }]);
    const ticket = reading.statements.find((s) => s.keyword === 'class');
    expect(ticket?.lines.map((l) => [l.member, l.flags])).toEqual([
      ['- number : Integer', { abstract: false, static: false }],
      ['+ total() : Money', { abstract: true, static: false }],
    ]);
  });

  it('needs a header naming the kind', () => {
    expect(codes(readAs(sequence, 'participant api'))).toEqual(['L100']);
    expect(codes(readAs(sequence, 'diagram structure "Shop"'))).toContain('L100');
  });

  it('names the keywords allowed in place of an unknown one and suggests the closest', () => {
    const [found] = readAs(sequence, 'diagram sequence "x"', 'participnt api').diagnostics;
    expect(found?.code).toBe('L101');
    expect(found && formatDiagnostic(found)).toBe(
      'Unknown keyword `participnt` here; did you mean `participant`? Allowed: `participant`, `msg`, `alt`.',
    );
  });

  it('explains a missing argument with an example of a correct line', () => {
    const [found] = readAs(sequence, 'diagram sequence "x"', 'participant api "API"', 'msg api ->').diagnostics;
    expect(found && formatDiagnostic(found)).toBe(
      '`msg` needs to: the id of a `participant` declared in this diagram. Example: `msg client -> api "GET /orders"`',
    );
  });

  it('rejects values outside their type, tokens after the arguments and unknown attributes', () => {
    const reading = readAs(
      structure,
      'diagram structure "x"',
      'node api "API" tone=red',
      'node db "DB" shiny',
      'node cache "Cache" color=blue',
    );
    expect(codes(reading)).toEqual(['L103', 'L104', 'L105']);
  });

  it('rejects indented text lines under a statement without a line form', () => {
    expect(codes(readAs(structure, 'diagram structure "x"', 'group g "G"', '  "member"'))).toEqual(['L106']);
  });

  it('checks that references point to declared ids and that ids are unique', () => {
    const reading = readAs(sequence, 'diagram sequence "x"', 'participant api', 'participant api', 'msg api -> db');
    expect(codes(reading)).toEqual(['L108', 'L107']);
    const unknown = reading.diagnostics.find((d) => d.code === 'L107');
    expect(unknown?.values).toMatchObject({ found: 'db', known: '`api`, `api`' });
  });
});

describe('readKind with attributes and recursion', () => {
  const body: StatementSpec[] = [];
  const box = statement('box', {
    doc: 'A box that may contain boxes.',
    examples: ['box b1 "Outer" mark=b1'],
    arguments: [arg('id', identifier(), 'Id of the box.'), arg('label', text(), 'Title.')],
    attributes: { mark: attr(ref('box'), 'Another box this one points to.'), alias: attr(identifier(), 'Second id.') },
    children: body,
  });
  body.push(box);
  const nested = kind('nested', { doc: 'Boxes in boxes.', statements: [box] });

  it('checks ids and references written as attributes like arguments', () => {
    const reading = readAs(nested, 'diagram nested "x"', 'box a "A" alias=b mark=b', 'box c "C" mark=missing alias=a');
    expect(codes(reading)).toEqual(['L107', 'L108']);
    expect(reading.diagnostics[0]?.values).toMatchObject({ name: 'mark=', found: 'missing' });
    expect(reading.diagnostics[1]?.values).toMatchObject({ found: 'a', first: '2' });
  });

  it('reads, checks and describes statements that contain themselves', () => {
    const reading = readAs(nested, 'diagram nested "x"', 'box a "A"', '  box b "B"', '    box c "C" mark=a');
    expect(codes(reading)).toEqual([]);
    expect(reading.statements[0]?.children[0]?.children[0]).toMatchObject({ id: 'c' });
    expect(checkKind(nested)).toEqual([]);
    const [outer] = grammarOf(nested).statements;
    expect(outer?.children.map((c) => [c.keyword, c.repeats, c.children.length])).toEqual([['box', true, 0]]);
  });
});

describe('checkKind', () => {
  it('accepts tables where everything is documented and every example reads cleanly', () => {
    expect(checkKind(sequence)).toEqual([]);
    expect(checkKind(structure)).toEqual([]);
  });

  it('reports missing docs, missing examples and examples that do not read', () => {
    const broken = kind('broken', {
      doc: '',
      statements: [
        statement('a', { doc: 'Has no example.', examples: [] }),
        statement('b', { doc: '', examples: ['b extra'] }),
      ],
    });
    expect(checkKind(broken)).toEqual([
      'kind broken has no doc',
      'statement a has no example',
      'statement b has no doc',
      'statement b: example `b extra` has L104',
    ]);
  });
});

describe('grammarOf', () => {
  it('describes every statement as data, with choices and references for agents', () => {
    const msg = grammarOf(sequence).statements.find((s) => s.keyword === 'msg');
    expect(msg?.examples).toEqual(['msg client -> api "GET /orders"']);
    expect(msg?.arguments.map((a) => [a.name, a.type, a.choices ?? a.refersTo])).toEqual([
      ['from', 'ref', ['participant']],
      ['arrow', 'arrow', ['->', '-->']],
      ['to', 'ref', ['participant']],
      ['label', 'text', undefined],
    ]);
  });
});
