import { defineConfig } from 'tsdown';
import { shared } from '../../tsdown.config.ts';

/** The testkit uses node:fs and runs on Node only; kernel and plugins stay platform neutral. */
export default defineConfig({ ...shared, platform: 'node' });
