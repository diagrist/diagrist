#!/usr/bin/env node
import type { Engine } from './engine.js';
import { nodeIo } from './node-io.js';
import { run } from './run.js';

/**
 * Wiring point for the diagram kernel: pass the engine built on `@diagrist/core` here. Until it exists there
 * is none, so `fmt` works and `check`, `build` and `grammar` answer that kind support arrives with the kernel.
 */
const engine: Engine | undefined = undefined;

process.exitCode = await run(process.argv.slice(2), nodeIo(), engine);
