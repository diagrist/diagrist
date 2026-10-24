import { defineConfig } from 'tsdown';

/** Two entries: the platform neutral exporter and its Node host, which reads the module and the fonts from disk. */
export default defineConfig({ entry: ['src/index.ts', 'src/node.ts'] });
