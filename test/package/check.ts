import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The fields of a package.json that name built files. */
interface Manifest {
  readonly name: string;
  readonly version: string;
  readonly bin?: Readonly<Record<string, string>>;
  readonly exports?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

const EXAMPLE = 'plugins/plugin-uml/examples/sequence/oauth-pkce.dgr';
const EXAMPLES = readdirSync('plugins', { recursive: true, encoding: 'utf8' })
  .filter((path) => path.includes('examples/') && path.endsWith('.dgr'))
  .map((path) => join('plugins', path));
const GOLDEN = 'plugins/plugin-uml/test/__golden__/oauth-pkce.svg';

const packages = ['packages', 'plugins'].flatMap((group) =>
  readdirSync(group, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(group, entry.name, 'package.json')))
    .map((entry) => join(group, entry.name)),
);

/**
 * Checks the built packages after `pnpm build` or `pnpm -r run build`, so a build that writes other file names than
 * package.json promises fails CI instead of the first install. Run with `node test/package/check.ts`; it prints one
 * line per problem and exits with 1 if there is any.
 */
const problems = packages.flatMap((dir) => {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest;
  const promised = [
    ...Object.values(manifest.bin ?? {}),
    ...Object.values(manifest.exports ?? {}).flatMap((entry) =>
      Object.entries(entry)
        .filter(([condition]) => condition !== '@diagrist/source')
        .map(([, path]) => path),
    ),
  ];
  const missing = promised
    .filter((path) => !existsSync(join(dir, path)))
    .map((path) => `${manifest.name}: ${path} is in package.json but was not built`);
  const bins = [...new Set(Object.values(manifest.bin ?? {}))].map((path) => join(dir, path));
  return [...missing, ...bins.filter(existsSync).flatMap((bin) => smoke(bin, manifest.version))];
});

/**
 * Runs the built CLI the way users and agents do: version, a pipe that closes early, a real build with its PNG,
 * `fmt --check`.
 */
function smoke(bin: string, version: string): string[] {
  const run = (args: readonly string[]) => spawnSync('node', [bin, ...args], { encoding: 'utf8' });
  const out = join(mkdtempSync(join(tmpdir(), 'diagrist-dist-')), 'out.svg');
  const piped = spawnSync('sh', ['-c', `node ${bin} grammar sequence | head -n 1 > /dev/null; exit $?`], {
    encoding: 'utf8',
  });
  const built = run(['build', EXAMPLE, '-o', out, '--png']);
  const formatted = run(['fmt', '--check', ...EXAMPLES]);
  return [
    run(['--version']).stdout === `${version}\n` ? '' : `${bin} --version does not print ${version}`,
    piped.stderr === '' ? '' : `${bin} grammar sequence | head writes to stderr: ${piped.stderr.split('\n')[0]}`,
    built.status === 0 && readFileSync(out, 'utf8') === readFileSync(GOLDEN, 'utf8')
      ? ''
      : `${bin} build ${EXAMPLE} does not write the golden SVG`,
    pngProblem(bin, out.replace(/\.svg$/, '.png')),
    formatted.status === 0 ? '' : `examples are not formatted: ${formatted.stdout.trim().split('\n').join(', ')}`,
  ].filter((problem) => problem !== '');
}

/**
 * The PNG of `build --png` must be the golden SVG at the default scale 2, read from the PNG's own header, so a
 * renderer that is missing from the build, or draws at another size, fails here.
 */
function pngProblem(bin: string, png: string): string {
  const [width, height] = (/width="(\d+)" height="(\d+)"/.exec(readFileSync(GOLDEN, 'utf8')) ?? [])
    .slice(1)
    .map(Number);
  const expected = `${(width ?? 0) * 2}x${(height ?? 0) * 2}`;
  if (!existsSync(png)) return `${bin} build ${EXAMPLE} --png writes no PNG`;
  const bytes = readFileSync(png);
  const found =
    bytes.toString('latin1', 12, 16) === 'IHDR' ? `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}` : 'no PNG';
  return found === expected ? '' : `${bin} build ${EXAMPLE} --png writes ${found}, expected ${expected}`;
}

for (const problem of problems) process.stderr.write(`${problem}\n`);
process.stdout.write(`${packages.length} packages checked, ${problems.length} problems\n`);
process.exitCode = problems.length > 0 ? 1 : 0;
