import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { staleFiles } from './dist.ts';

/** The fields of a package.json that name built files. */
interface Manifest {
  readonly name: string;
  readonly version: string;
  readonly private?: boolean;
  readonly bin?: Readonly<Record<string, string>>;
  readonly exports?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** The export condition that resolves to `src/` inside the workspace; it never names a published file. */
const SOURCE = '@diagrist/source';

/** One example per diagram plugin, with the hash file its tests keep the SVG's SHA-256 in, and its line there. */
const PICTURES = [
  {
    plugin: 'plugins/plugin-uml',
    example: 'sequence/oauth-pkce.dgr',
    hashes: 'sequence-examples.sha256',
    listed: 'sequence/oauth-pkce.dgr',
  },
  {
    plugin: 'plugins/plugin-architecture',
    example: 'architecture/cloud.dgr',
    hashes: 'examples.sha256',
    listed: 'architecture/cloud.dgr',
  },
] as const;

const EXAMPLES = readdirSync('plugins', { recursive: true, encoding: 'utf8' })
  .filter((path) => path.includes('examples/') && path.endsWith('.dgr'))
  .map((path) => resolve('plugins', path));

const packages = ['packages', 'plugins'].flatMap((group) =>
  readdirSync(group, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(group, entry.name, 'package.json')))
    .map((entry) => join(group, entry.name)),
);
const manifestOf = (dir: string) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest;
const published = packages.filter((dir) => manifestOf(dir).private !== true);

/** The files a package.json promises: its bins and every export target but the source condition. */
function promised(manifest: Manifest): string[] {
  const targets = Object.values(manifest.exports ?? {}).flatMap((entry) =>
    Object.entries(entry)
      .filter(([condition]) => condition !== SOURCE)
      .map(([, path]) => path),
  );
  return [...Object.values(manifest.bin ?? {}), ...targets];
}

/**
 * Built files that `package.json` names in the workspace but the build did not write, and files in `dist` that the
 * build did not write either, left over from an earlier one: they would end up in the tarball.
 */
function unbuilt(dir: string): string[] {
  const manifest = manifestOf(dir);
  return [
    ...promised(manifest)
      .filter((path) => !existsSync(join(dir, path)))
      .map((path) => `${manifest.name}: ${path} is in package.json but was not built`),
    ...staleFiles(dir, promised(manifest)).map(
      (path) => `${manifest.name}: ${path} is left over from an earlier build; the build cleans dist, so build again`,
    ),
  ];
}

/**
 * Packs every published package as npm would receive it and installs the tarballs into an empty project, the way a
 * user does. Returns the project, or the problem that stopped it.
 */
function install(): { project: string } | { problem: string } {
  const scratch = mkdtempSync(join(tmpdir(), 'diagrist-pack-'));
  const [tarballs, project] = [join(scratch, 'tarballs'), join(scratch, 'project')];
  const filters = published.flatMap((dir) => ['--filter', `./${dir}`]);
  const packed = spawnSync('pnpm', ['-r', ...filters, 'pack', '--pack-destination', tarballs], { encoding: 'utf8' });
  if (packed.status !== 0) return { problem: `pnpm pack failed: ${packed.stderr.trim()}` };
  mkdirSync(project);
  writeFileSync(join(project, 'package.json'), '{ "private": true }\n');
  const files = readdirSync(tarballs).map((file) => join(tarballs, file));
  const flags = ['--no-audit', '--no-fund', '--no-package-lock', '--ignore-scripts', '--prefer-offline'];
  const installed = spawnSync('npm', ['install', ...flags, ...files], { cwd: project, encoding: 'utf8' });
  if (installed.status !== 0) return { problem: `npm install of the tarballs failed: ${installed.stderr.trim()}` };
  return { project };
}

/**
 * What is wrong with an installed package: a promised file missing from the tarball, a subpath that only the
 * workspace resolves, another version than the workspace, a missing LICENSE or NOTICE, or files that do not belong
 * in it, such as source maps or sources.
 */
function tarballProblems(project: string, dir: string): string[] {
  const workspace = manifestOf(dir);
  const root = join(project, 'node_modules', workspace.name);
  const manifest = manifestOf(root);
  const files = readdirSync(root, { recursive: true, encoding: 'utf8' });
  const name = workspace.name;
  return [
    ...promised(manifest)
      .filter((path) => !existsSync(join(root, path)))
      .map((path) => `${name}: ${path} is in the packed package.json but not in the tarball`),
    ...Object.entries(manifest.exports ?? {})
      .filter(([, entry]) => Object.keys(entry).every((condition) => condition === SOURCE))
      .map(([subpath]) => `${name}: export ${subpath} resolves only inside the workspace`),
    manifest.version === workspace.version ? '' : `${name}: packed as ${manifest.version}, not ${workspace.version}`,
    ...['LICENSE', 'NOTICE'].filter((file) => !files.includes(file)).map((file) => `${name}: ${file} is missing`),
    ...files
      .filter((file) => file.endsWith('.map') || file.startsWith('src'))
      .map((file) => `${name}: ${file} does not belong in the tarball`),
  ].filter((problem) => problem !== '');
}

/**
 * Runs the installed CLI the way users and agents do: version, a pipe that closes early, one build per diagram
 * plugin compared with the SHA-256 its tests keep, a PNG, `fmt --check` over every example.
 */
function smoke(project: string, version: string): string[] {
  const bin = join(project, 'node_modules', '.bin', 'dgr');
  const run = (args: readonly string[]) => spawnSync(bin, args, { cwd: project, encoding: 'utf8' });
  const piped = spawnSync('sh', ['-c', `"${bin}" grammar sequence | head -n 1 > /dev/null; exit $?`], {
    encoding: 'utf8',
  });
  const formatted = run(['fmt', '--check', ...EXAMPLES]);
  return [
    run(['--version']).stdout === `${version}\n` ? '' : `dgr --version does not print ${version}`,
    piped.stderr === '' ? '' : `dgr grammar sequence | head writes to stderr: ${piped.stderr.split('\n')[0]}`,
    ...PICTURES.map((picture, index) => pictureProblem(run, project, picture, index === 0)),
    formatted.status === 0 ? '' : `examples are not formatted: ${formatted.stdout.trim().split('\n').join(', ')}`,
  ].filter((problem) => problem !== '');
}

/** Builds one example; its SVG must hash as its plugin's tests say, and with `png` a PNG of twice its size follows. */
function pictureProblem(
  run: (args: readonly string[]) => { status: number | null },
  project: string,
  picture: (typeof PICTURES)[number],
  png: boolean,
): string {
  const source = resolve(picture.plugin, 'examples', picture.example);
  const out = join(project, `${picture.example.replace(/\W/g, '-')}.svg`);
  const built = run(['build', source, '-o', out, ...(png ? ['--png'] : [])]);
  if (built.status !== 0 || !existsSync(out)) return `dgr build ${picture.example} failed`;
  const svg = readFileSync(out, 'utf8');
  const hashes = readFileSync(join(picture.plugin, 'test', '__golden__', picture.hashes), 'utf8').split('\n');
  const hash = createHash('sha256').update(svg).digest('hex');
  if (!hashes.includes(`${hash}  ${picture.listed}`)) return `dgr build ${picture.example} differs from its hash`;
  return png ? pngProblem(svg, out.replace(/\.svg$/, '.png')) : '';
}

/**
 * The PNG of `build --png` must be the SVG at the default scale 2, read from the PNG's own header, so a renderer
 * that is missing from the tarball, or draws at another size, fails here.
 */
function pngProblem(svg: string, png: string): string {
  const [width, height] = (/width="(\d+)" height="(\d+)"/.exec(svg) ?? []).slice(1).map(Number);
  const expected = `${(width ?? 0) * 2}x${(height ?? 0) * 2}`;
  if (!existsSync(png)) return 'dgr build --png writes no PNG';
  const bytes = readFileSync(png);
  const found =
    bytes.toString('latin1', 12, 16) === 'IHDR' ? `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}` : 'no PNG';
  return found === expected ? '' : `dgr build --png writes ${found}, expected ${expected}`;
}

/**
 * Checks the built packages after `pnpm build` or `pnpm -r run build`: what each package.json promises was built,
 * and the tarballs npm would receive install into an empty project and work there. Run with
 * `node test/package/check.ts`; it prints one line per problem and exits with 1 if there is any.
 */
function check(): string[] {
  const missing = packages.flatMap(unbuilt);
  if (missing.length > 0) return missing;
  const installed = install();
  if ('problem' in installed) return [installed.problem];
  const cli = published.find((dir) => manifestOf(dir).bin !== undefined) ?? '';
  const problems = [
    ...published.flatMap((dir) => tarballProblems(installed.project, dir)),
    ...smoke(installed.project, manifestOf(cli).version),
  ];
  rmSync(join(installed.project, '..'), { recursive: true, force: true });
  return problems;
}

const problems = check();
for (const problem of problems) process.stderr.write(`${problem}\n`);
process.stdout.write(`${packages.length} packages checked, ${published.length} packed, ${problems.length} problems\n`);
process.exitCode = problems.length > 0 ? 1 : 0;
