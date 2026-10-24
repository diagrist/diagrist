import { defineConfig } from 'tsdown';
import { shared } from '../../tsdown.config.ts';

/** The CLI runs on Node only. `main.ts` is the bin behind `diagrist` and `dgr`, `index.ts` the library API. */
export default defineConfig({ ...shared, entry: ['src/index.ts', 'src/main.ts'], platform: 'node' });
