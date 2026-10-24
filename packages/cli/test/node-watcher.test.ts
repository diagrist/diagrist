import { mkdtempSync, readFileSync, renameSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { run } from '../src/index.js';
import { nodeIo } from '../src/node-io.js';
import { nodeWatcher } from '../src/node-watcher.js';
import { fakeEngine, LOGIN } from './support/fake-engine.js';
import { fakeRaster } from './support/fake-raster.js';

/**
 * Waits until `ready` holds, checking often, and fails with `what` when it does not within a second. A build after a
 * save takes some 50 ms, and the three waits of a test stay well within the test's own limit of five seconds.
 */
async function until(what: string, ready: () => boolean, limit = 1000): Promise<void> {
  for (let waited = 0; !ready(); waited += 10) {
    if (waited >= limit) throw new Error(`gave up waiting for ${what}`);
    await sleep(10);
  }
}

const titled = (title: string): string => LOGIN.replace('"Login"', `"${title}"`);

describe('the Node watcher', () => {
  it('builds again on a save in place and on a save by renaming, and not when the file is only touched', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diagrist-watch-'));
    const source = join(dir, 'login.dgr');
    const svg = join(dir, 'login.svg');
    writeFileSync(source, LOGIN);
    const printed: string[] = [];
    const io = { ...nodeIo(), stdout: (text: string) => void printed.push(text) };
    const stop = new AbortController();
    const watcher = nodeWatcher({ settle: 20, stop: stop.signal });
    const running = run(['build', source, '--watch'], { io, engine: fakeEngine(), raster: fakeRaster(), watcher });
    const svgIs = (title: string) => (): boolean => readFileSync(svg, 'utf8') === `<svg>${title}</svg>`;
    const changed = (): number => printed.filter((line) => line.startsWith('changed ')).length;
    try {
      await until('the first build', () => printed.some((line) => line.startsWith('watching ')));
      expect(readFileSync(svg, 'utf8')).toBe('<svg>Login</svg>');

      writeFileSync(source, titled('In place'));
      await until('the build after a save in place', svgIs('In place'));

      writeFileSync(join(dir, '.login.dgr.tmp'), titled('Renamed'));
      renameSync(join(dir, '.login.dgr.tmp'), source);
      await until('the build after a save by renaming', svgIs('Renamed'));

      writeFileSync(source, titled('Renamed'));
      utimesSync(source, new Date(), new Date());
      await sleep(200);
      expect(changed()).toBe(2);
    } finally {
      stop.abort();
    }
    expect(await running).toBe(0);
  });

  it('ends at once when it is stopped before anything changed', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diagrist-watch-'));
    const source = join(dir, 'login.dgr');
    writeFileSync(source, LOGIN);
    const stop = new AbortController();
    const changes = nodeWatcher({ stop: stop.signal }).changes(source);
    const next = changes.next();
    stop.abort();
    expect(await next).toEqual({ done: true, value: undefined });
  });
});
