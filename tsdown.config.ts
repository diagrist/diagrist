import { defineConfig } from 'tsdown';

// Gemeinsame Build-Einstellungen; Pakete erben sie (tsdown sucht die Wurzelkonfiguration).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  target: 'es2023',
  dts: true,
  sourcemap: true,
  clean: true,
  // Alle Pakete sind "type": "module"; .js statt .mjs, passend zu den exports in den package.json.
  fixedExtension: false,
});
