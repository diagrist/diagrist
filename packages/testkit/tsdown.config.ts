import { defineConfig } from 'tsdown';

// Erbt die Wurzelkonfiguration (Workspace-Modus). Das Testkit nutzt node:fs und läuft nur unter Node;
// der Standard "neutral" gilt für Kern und Plugins.
export default defineConfig({ platform: 'node' });
