/**
 * The example picker, only for `pnpm dev` on the author's machine: `import.meta.env.DEV` is false in the build, so
 * neither the picker nor a single example reaches the deployed site.
 */
const loaders = import.meta.glob<string>('../../../plugins/*/examples/**/*.dgr', { query: '?raw', import: 'default' });

/** Puts a select with every example of the plugins into `bar`; `load` receives the chosen source. */
export function mountExamples(bar: HTMLElement, load: (source: string) => void): void {
  const select = document.createElement('select');
  select.add(new Option('Beispiel (lokal) …', ''));
  const entries = Object.entries(loaders)
    .map(([path, loader]) => [path.replace(/^.*\/examples\//, '').replace(/\.dgr$/, ''), loader] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [label] of entries) select.add(new Option(label, label));
  const byLabel = new Map(entries);
  select.addEventListener('change', async () => {
    const loader = byLabel.get(select.value);
    if (loader) load(await loader());
    select.value = '';
  });
  bar.querySelector('.brand')?.after(select);
}
