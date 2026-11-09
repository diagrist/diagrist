/**
 * The body of `board.js`, plain JavaScript for Figma's `use_figma`, which runs it with top-level `await` and hands
 * back what it returns. It reads `INPUT`, which `boardScript` writes above it, and needs nothing else.
 *
 * What it does, after the pictures were uploaded with `upload_assets`: it finds each uploaded layer on the page by
 * its name (the file name without extension, which a multipart upload gives it), makes one section per picture in
 * the canvas colour, sized to the picture, inside a section for the board when there are several, moves each layer
 * into its section at (0, 0) and brings it to the section's size. Sections are tagged with shared plugin data
 * `diagrist`/`id`, because `setPluginData` throws in `use_figma` (measured 2026-11-09), and found again with
 * `findAllWithCriteria`. An earlier export with the same id, or else the same name, is replaced at its place;
 * otherwise the board goes right of everything on the page. Sections do not grow with their children, so every
 * size is set here. It returns the ids it made and the layers it did not find.
 */
export const BOARD_SCRIPT = `const NS = 'diagrist';
const page = figma.currentPage;
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};
const sized = (node, width, height) =>
  typeof node.resizeWithoutConstraints === 'function' ? node.resizeWithoutConstraints(width, height) : node.resize(width, height);
const tagged = page
  .findAllWithCriteria({ sharedPluginData: { namespace: NS, keys: ['id'] } })
  .filter((node) => node.type === 'SECTION');
const withId = (id) => tagged.filter((node) => !node.removed && node.getSharedPluginData(NS, 'id') === id);
const named = (name) => page.children.find((node) => node.type === 'SECTION' && node.name === name);

const uploads = new Map();
for (const sheet of INPUT.sheets) {
  const found = page.children.filter((node) => node.type !== 'SECTION' && (node.name === sheet.layer || node.name === sheet.file));
  if (found.length > 0) uploads.set(sheet.id, found[found.length - 1]);
}
const uploaded = new Set(uploads.values());

function spotOf(spec) {
  const old = withId(spec.id)[0] || named(spec.name);
  if (old) return { parent: old.parent, x: old.x, y: old.y, old };
  const others = page.children.filter((node) => !uploaded.has(node));
  const right = Math.max(...others.map((node) => node.x + node.width + INPUT.gap));
  return { parent: page, x: others.length > 0 ? right : 0, y: 0 };
}

function section(spec, parent, x, y) {
  const node = figma.createSection();
  parent.appendChild(node);
  node.name = spec.name;
  node.x = x;
  node.y = y;
  sized(node, spec.width, spec.height);
  node.fills = [{ type: 'SOLID', color: rgb(spec.fill) }];
  node.setSharedPluginData(NS, 'id', spec.id);
  return node;
}

function fit(parent, child) {
  if (parent.type !== 'SECTION') return;
  const width = Math.max(parent.width, child.x + child.width + INPUT.pad);
  const height = Math.max(parent.height, child.y + child.height + INPUT.pad);
  if (width > parent.width || height > parent.height) sized(parent, width, height);
}

const top = INPUT.board || INPUT.sheets[0];
const spot = spotOf(top);
const outer = section(top, spot.parent, spot.x, spot.y);
fit(spot.parent, outer);
const replaced = [];
if (spot.old) {
  replaced.push(spot.old.id);
  spot.old.remove();
}
const sheets = [];
const missing = [];
for (const spec of INPUT.sheets) {
  const sheet = INPUT.board ? section(spec, outer, spec.x, spec.y) : outer;
  for (const old of withId(spec.id)) {
    replaced.push(old.id);
    old.remove();
  }
  const layer = uploads.get(spec.id);
  if (layer) {
    sheet.appendChild(layer);
    layer.x = 0;
    layer.y = 0;
    const factor = spec.width / layer.width;
    if (Math.abs(factor - 1) > 0.001) {
      if (typeof layer.rescale === 'function') layer.rescale(factor);
      else layer.resize(spec.width, spec.height);
    }
  } else {
    missing.push(spec.layer);
  }
  sheets.push({ name: spec.name, section: sheet.id, layer: layer ? layer.id : null });
}
figma.viewport.scrollAndZoomIntoView([outer]);
return { board: INPUT.board ? outer.id : null, sheets, missing, replaced };
`;
