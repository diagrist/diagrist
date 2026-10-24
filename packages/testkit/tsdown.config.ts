import { defineConfig } from 'tsdown';

/** The testkit uses node:fs and runs on Node only; kernel and plugins stay platform neutral. */
export default defineConfig({ platform: 'node' });
