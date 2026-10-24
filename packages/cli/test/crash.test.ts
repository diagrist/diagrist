import { describe, expect, it } from 'vitest';
import type { Engine } from '../src/index.js';
import { fakeEngine, LOGIN } from './support/fake-engine.js';
import { call } from './support/memory-io.js';

const SOURCE = 'login.dgr';
const LOGOUT = LOGIN.replace('"Login"', '"Logout"');

/** The fake engine, except that it throws for every source `fails` accepts, as a broken kernel or plugin would. */
function throwing(fails: (source: string) => boolean): Engine {
  const engine = fakeEngine();
  return {
    ...engine,
    compile: (source, options) => {
      if (fails(source)) throw new TypeError('boom\n    at layout (plugin.js:1:1)');
      return engine.compile(source, options);
    },
  };
}

describe('an exception nothing else caught', () => {
  it('ends the call with exit code 2 and one line on stderr that asks for a report, without the stack', async () => {
    const result = await call(['check', SOURCE], { files: { [SOURCE]: LOGIN }, engine: throwing(() => true) });
    expect(result).toMatchObject({ exitCode: 2, stdout: '' });
    expect(result.stderr).toBe(
      'dgr stopped on an unexpected error: TypeError: boom. This is a bug, not a mistake in the call or the diagram; please report it with both at https://github.com/diagrist/diagrist/issues.\n',
    );
  });

  it('does not end --watch after the first build, and the next change builds again', async () => {
    const changes = [{ [SOURCE]: LOGOUT }, { [SOURCE]: LOGIN }];
    const engine = throwing((source) => source.includes('Logout'));
    const result = await call(['build', SOURCE, '--watch', '--locale', 'de'], {
      files: { [SOURCE]: LOGIN },
      changes,
      engine,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe(
      'dgr ist an einem unerwarteten Fehler gescheitert: TypeError: boom. Das ist ein Programmfehler, kein Fehler im Aufruf oder im Diagramm; bitte mit beidem melden unter https://github.com/diagrist/diagrist/issues.\n',
    );
    expect(result.stdout.split('geändert: login.dgr\n')).toEqual([
      'geschrieben: login.svg\nbeobachte login.dgr, Strg+C beendet\n',
      '',
      'geschrieben: login.svg\n',
    ]);
  });
});

describe('a finding about a control character', () => {
  it('shows it as U+FFFD in the source line, so a source cannot steer the terminal', async () => {
    const source = LOGIN.replace('"Browser"', '"\u001b[2J"');
    const result = await call(['check', SOURCE], { files: { [SOURCE]: source } });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('login.dgr:2:21  L005  error: The character U+001B');
    expect(result.stdout).toContain('participant client "�[2J"\n');
    expect(result.stdout).not.toContain('\u001b');
  });
});
