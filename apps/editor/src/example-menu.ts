/**
 * Every example of the plugins, the same files the gallery of diagrist.com shows. The editor loads this module after
 * its first picture, so the sources do not delay the start.
 */
const SOURCES = import.meta.glob<string>('../../../plugins/*/examples/**/*.dgr', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** The plugins by the names their folders carry, in the order the gallery shows them. */
const PLUGINS: Readonly<Record<string, string>> = {
  uml: 'UML',
  architecture: 'C4',
  code: 'Code',
  concept: 'Concept',
};

/** An example that reads other files, with `use` or `src=`, cannot be drawn here: the editor holds one source. */
const readsFiles = (source: string) => /^\s*use\s+"/m.test(source) || /\bsrc="/.test(source);

interface Entry {
  readonly group: string;
  readonly label: string;
  readonly source: string;
}

function entries(): Entry[] {
  const order = Object.keys(PLUGINS);
  const all = Object.entries(SOURCES)
    .filter(([, source]) => !readsFiles(source))
    .map(([path, source]) => {
      const [, plugin = '', folder = '', file = ''] = /plugin-([\w-]+)\/examples\/(.+)\/([^/]+)\.dgr$/.exec(path) ?? [];
      const title = /^diagram\s+[\w-]+\s+"([^"]*)"/m.exec(source)?.[1] ?? file;
      const look = /^diagram\b.*\blook=([\w-]+)/m.exec(source)?.[1];
      return {
        rank: order.indexOf(plugin),
        group: `${PLUGINS[plugin] ?? plugin}: ${folder}`,
        label: look === undefined ? title : `${title} (${look})`,
        source,
      };
    });
  return all.sort((a, b) => a.rank - b.rank || compare(a.group, b.group) || compare(a.label, b.label));
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Fills the select with the examples by plugin and folder; `load` receives the chosen source. */
export function fillExamples(select: HTMLSelectElement, load: (source: string) => void): void {
  const list = entries();
  const groups = new Map<string, HTMLOptGroupElement>();
  list.forEach((entry, index) => {
    let group = groups.get(entry.group);
    if (group === undefined) {
      group = Object.assign(document.createElement('optgroup'), { label: entry.group });
      groups.set(entry.group, group);
      select.append(group);
    }
    group.append(new Option(entry.label, String(index)));
  });
  select.addEventListener('change', () => {
    const entry = list[Number(select.value)];
    if (select.value !== '' && entry !== undefined) load(entry.source);
    select.value = '';
  });
}
