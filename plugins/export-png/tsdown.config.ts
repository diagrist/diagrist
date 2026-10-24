import { defineConfig } from 'tsdown';
import { shared } from '../../tsdown.config.ts';

/** Two entries: the platform neutral exporter and its Node host, which reads the module and the fonts from disk. */
export default defineConfig({ ...shared, entry: ['src/index.ts', 'src/node.ts'] });
