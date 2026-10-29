import type { Block, PlacedCell, PlacedSide, PlacedTop, SideEntry, TableLayout, TableSpec } from './spec.js';

/** Height a block of text asks for: its lines and the room above and below. */
const tall = (block: Block, spec: TableSpec): number => block.lines * spec.metrics.lineHeight + 2 * spec.metrics.pad.y;

/** Width a block of text asks for: its widest line and the room left and right. */
const wide = (block: Block, spec: TableSpec): number => block.width + 2 * spec.metrics.pad.x;

/**
 * Places a table. Every cell is as wide as the widest top head asks, so the columns read as equal; the top heads
 * are as tall as the tallest. The side heads are as wide as the widest line head asks, and a band wider than the
 * whole table widens them. A line is as tall as its head asks and at least as tall as a cell; a band as its head.
 * Nothing is wrapped here: the caller wraps and measures its texts and hands over blocks.
 */
export function placeTable(spec: TableSpec): TableLayout {
  const { x, y, metrics } = spec;
  const cellW = Math.max(metrics.cell.w, ...spec.top.map((t) => wide(t.head, spec)));
  const topH = Math.max(0, ...spec.top.map((t) => tall(t.head, spec)));
  const cellsW = cellW * spec.top.length;
  const lineHeads = spec.side.filter((s) => s.kind === 'line').map((s) => wide(s.head, spec));
  const bandHeads = spec.side.filter((s) => s.kind === 'band').map((s) => wide(s.head, spec) - cellsW);
  const sideW = Math.max(0, ...lineHeads, ...bandHeads);
  const bodyX = x + sideW;
  const bodyY = y + topH;
  const width = sideW + cellsW;
  const top: PlacedTop[] = spec.top.map((t, i) => ({
    key: t.key,
    rect: { x: bodyX + i * cellW, y, w: cellW, h: topH },
  }));
  const side: PlacedSide[] = [];
  const cells: PlacedCell[] = [];
  let at = bodyY;
  for (const entry of spec.side) {
    const h = heightOf(entry, spec);
    if (entry.kind === 'band') side.push({ kind: 'band', key: entry.key, rect: { x, y: at, w: width, h } });
    else {
      side.push({ kind: 'line', key: entry.key, rect: { x, y: at, w: sideW, h } });
      for (const t of top) cells.push({ top: t.key, line: entry.key, rect: { x: t.rect.x, y: at, w: cellW, h } });
    }
    at += h;
  }
  return {
    top,
    side,
    cells,
    body: { x: bodyX, y: bodyY, w: cellsW, h: at - bodyY },
    frame: { x, y, w: width, h: at - y },
  };
}

function heightOf(entry: SideEntry, spec: TableSpec): number {
  const own = tall(entry.head, spec);
  return entry.kind === 'band' ? own : Math.max(spec.metrics.cell.h, own);
}
