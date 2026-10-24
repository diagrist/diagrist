import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Ein Testprojekt je Paket unter packages/ und plugins/. Inline definiert, damit jedes Projekt die
// Einstellungen unten erbt; als Ordner referenzierte Projekte würden das nicht tun.
const packages = ['packages', 'plugins'].flatMap((group) =>
  existsSync(group)
    ? readdirSync(group, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => `${group}/${entry.name}`)
    : [],
);

export default defineConfig({
  // Pakete lösen sich gegenseitig über ihren Quelltext auf (exports-Bedingung "@diagrist/source"),
  // nicht über dist/. So braucht es weder einen Build vor den Tests noch eine Alias-Liste.
  resolve: { conditions: ['@diagrist/source'] },
  test: {
    projects: packages.map((root) => ({ test: { name: root.split('/')[1] ?? root, root } })),
    // Die Kiste hat 8 Kerne; mehr Worker als Kerne führte im alten Repo zu Zeitüberschreitungen.
    maxWorkers: '50%',
  },
});
