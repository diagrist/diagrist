import { defineConfig } from 'tsdown';
import { shared } from '../../tsdown.config.ts';

/** One platform neutral entry: the flattener reads and writes strings only. */
export default defineConfig({ ...shared });
