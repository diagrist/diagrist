import { build } from './build.js';
import { check } from './check.js';
import type { Command } from './command.js';
import { fmt } from './fmt.js';
import { grammar } from './grammar.js';
import { help } from './help.js';

/** Every command, in the order `dgr help` and the reference list them. */
export const COMMANDS: readonly Command[] = [fmt, check, build, grammar, help];
