import type { Advances } from './ttf.js';

/** Characters per string of `runs`, so each line of the generated file stays within the formatter's width. */
const CHUNK = 110;

/** The runs of consecutive code points, packed as `src/packed-face.ts` reads them. */
function runsOf(f: Advances): string {
  const points = [...f.byCodePoint.keys()].sort((a, b) => a - b);
  const runs: string[] = [];
  let previous = -2;
  for (const point of points) {
    const advance = (f.byCodePoint.get(point) ?? 0).toString(36).padStart(3, '0');
    if (point === previous + 1) runs[runs.length - 1] += advance;
    else runs.push(`${point.toString(16)}:${advance}`);
    previous = point;
  }
  return runs.join(' ');
}

/** The source of a generated file with one packed face, `name` exported, documented by `doc`. */
export function packedSource(name: string, doc: readonly string[], f: Advances): string {
  const runs = runsOf(f);
  const chunks = Array.from({ length: Math.ceil(runs.length / CHUNK) }, (_, i) =>
    runs.slice(i * CHUNK, (i + 1) * CHUNK),
  );
  return [
    "import type { PackedFace } from './packed-face.js';",
    '',
    '/**',
    ...doc.map((line) => ` * ${line}`),
    ' */',
    `export const ${name}: PackedFace = {`,
    `  unitsPerEm: ${f.unitsPerEm},`,
    `  advance: ${f.missing},`,
    '  runs: [',
    ...chunks.map((chunk) => `    '${chunk}',`),
    '  ],',
    '};',
    '',
  ].join('\n');
}
