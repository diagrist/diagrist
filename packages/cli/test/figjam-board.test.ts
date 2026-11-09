import { describe, expect, it } from 'vitest';
import { LOGIN } from './support/fake-engine.js';
import { type FakeNode, fakeFigma, runScript } from './support/fake-figma.js';
import { figjamEngine } from './support/figjam-engine.js';
import { call } from './support/memory-io.js';

const engine = figjamEngine();
const VARIANTS = `${LOGIN}variant out "Logout"\n  msg api -> client "bye"\nvariant err "Error" from out\n`;
const files = { 'd/login.dgr': VARIANTS };

/** The `board.js` that `dgr export figjam` writes for `args`. */
async function boardJs(...args: string[]): Promise<string> {
  const result = await call(['export', 'figjam', 'd/login.dgr', ...args], { files, engine });
  expect(result.exitCode).toBe(0);
  return String(result.files.get('d/board.js'));
}

interface Placed {
  board: string | null;
  sheets: { name: string; section: string; layer: string | null }[];
  missing: string[];
  replaced: string[];
}

const sections = (page: FakeNode): FakeNode[] => page.descendants().filter((node) => node.type === 'SECTION');
const tag = (node: FakeNode): string => node.getSharedPluginData('diagrist', 'id');

describe('board.js against a fake of the plugin API', () => {
  it('lays the uploads into a board of three sheets right of the page content, each at the size of its picture', async () => {
    const { figma, page, upload, viewed } = fakeFigma();
    const sticky = upload('Notizen', 500, 400);
    const layers = ['login.figjam', 'login.out.figjam', 'login.err.figjam'].map((name) => upload(name, 300, 150));
    const placed = (await runScript(await boardJs(), figma)) as Placed;

    const [board, ...sheets] = sections(page);
    expect(placed).toMatchObject({ board: board?.id, missing: [], replaced: [] });
    expect(board).toMatchObject({ name: 'diagrist · login', x: sticky.width + 300, y: 0, width: 1800, height: 450 });
    expect(board?.parent).toBe(page);
    expect(tag(board as FakeNode)).toBe('board:login');
    expect(sheets.map((s) => [s.name, tag(s), s.x, s.y, s.width, s.height])).toEqual([
      ['diagrist · login.dgr', 'd/login.dgr', 150, 150, 300, 150],
      ['diagrist · login.dgr#out', 'd/login.dgr#out', 750, 150, 300, 150],
      ['diagrist · login.dgr#err', 'd/login.dgr#err', 1350, 150, 300, 150],
    ]);
    const canvas = 0xfa / 255;
    expect(sheets.map((s) => s.fills)).toEqual(
      Array(3).fill([{ type: 'SOLID', color: { r: canvas, g: canvas, b: canvas } }]),
    );
    for (const [i, layer] of layers.entries()) {
      expect(layer.parent).toBe(sheets[i]);
      expect([layer.x, layer.y, layer.rescaled]).toEqual([0, 0, []]);
    }
    expect(page.children).toEqual([sticky, board]);
    expect(viewed).toEqual([[board]]);
  });

  it('replaces an earlier board at its place, and the sheets of the earlier pictures with it', async () => {
    const { figma, page, upload } = fakeFigma();
    const script = await boardJs();
    for (const name of ['login.figjam', 'login.out.figjam', 'login.err.figjam']) upload(name, 300, 150);
    const first = (await runScript(script, figma)) as Placed;
    const old = page.children[0] as FakeNode;
    old.x = -800;
    old.y = 2000;
    for (const name of ['login.figjam', 'login.out.figjam', 'login.err.figjam']) upload(name, 300, 150);
    const second = (await runScript(script, figma)) as Placed;

    expect(second.replaced).toEqual([first.board]);
    expect(old.removed).toBe(true);
    expect(page.children).toHaveLength(1);
    expect(page.children[0]).toMatchObject({ id: second.board, x: -800, y: 2000 });
    expect(sections(page)).toHaveLength(4);
  });

  it('replaces one sheet inside its board when one variant is exported again, and grows the board to fit with the margin of its scale', async () => {
    const { figma, page, upload } = fakeFigma();
    for (const name of ['login.figjam', 'login.out.figjam', 'login.err.figjam']) upload(name, 300, 150);
    await runScript(await boardJs(), figma);
    const board = page.children[0] as FakeNode;
    const before = sections(page).find((s) => tag(s) === 'd/login.dgr#err') as FakeNode;

    upload('login.err.figjam', 900, 450);
    const placed = (await runScript(await boardJs('--variant', 'err', '--scale', '3'), figma)) as Placed;

    const after = sections(page).find((s) => tag(s) === 'd/login.dgr#err') as FakeNode;
    expect(placed).toMatchObject({ board: null, replaced: [before.id] });
    expect(after).toMatchObject({ parent: board, x: before.x, y: before.y, width: 600, height: 300 });
    expect(after.children[0]?.rescaled).toEqual([600 / 900]);
    expect([board.width, board.height]).toEqual([1350 + 600 + 300, 150 + 300 + 300]);
    expect(sections(page)).toHaveLength(4);
  });

  it('names the uploads it did not find and still makes their sections', async () => {
    const { figma, page, upload } = fakeFigma();
    upload('login.out.figjam.svg', 300, 150);
    const placed = (await runScript(await boardJs(), figma)) as Placed;
    expect(placed.missing).toEqual(['login.figjam', 'login.err.figjam']);
    expect(placed.sheets.map((s) => s.layer === null)).toEqual([true, false, true]);
    expect(sections(page)).toHaveLength(4);
  });
});
