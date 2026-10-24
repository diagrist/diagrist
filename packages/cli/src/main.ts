#!/usr/bin/env node
import { umlPlugin } from '@diagrist/plugin-uml';
import { coreEngine } from './core-engine.js';
import { nodeIo } from './node-io.js';
import { run } from './run.js';

/** The diagram kinds this build of the CLI can draw. */
const engine = coreEngine([umlPlugin]);

process.exitCode = await run(process.argv.slice(2), nodeIo(), engine);
