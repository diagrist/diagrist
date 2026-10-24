import { defineConfig } from 'tsdown';

/** The CLI runs on Node only. `main.ts` is the bin behind `diagrist` and `dgr`, `index.ts` the library API. */
export default defineConfig({ entry: ['src/index.ts', 'src/main.ts'], platform: 'node' });
