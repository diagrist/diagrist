import './fonts.css';
import './style.css';
import { setDiagnostics } from '@codemirror/lint';
import { basicSetup, EditorView } from 'codemirror';
import { copy, download, fileName, openEmbedDialog } from './actions.js';
import { DEFAULT_SOURCE } from './examples.js';
import { showFindings, toDiagnostics } from './findings.js';
import { dgrLanguage } from './highlight.js';
import type { Response } from './protocol.js';
import { createRenderer } from './renderer.js';
import { decodeSource, encodeSource } from './source-hash.js';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const preview = byId('preview');
const findingsList = byId('findings');

let last: Response | undefined;
let fragment = '';
let hashTimer: ReturnType<typeof setTimeout> | undefined;

const render = createRenderer((result) => {
  last = result;
  if (result.svg !== undefined) preview.innerHTML = result.svg;
  preview.classList.toggle('stale', result.svg === undefined);
  view.dispatch(setDiagnostics(view.state, toDiagnostics(view.state.doc, result.findings)));
  showFindings(findingsList, result.findings, (f) => {
    const line = view.state.doc.line(Math.min(Math.max(f.line, 1), view.state.doc.lines));
    view.dispatch({ selection: { anchor: Math.min(line.from + f.column - 1, line.to) }, scrollIntoView: true });
    view.focus();
  });
});

/** Writes the source into the address without a new history entry; nothing is sent anywhere. */
async function storeInHash(source: string): Promise<void> {
  fragment = await encodeSource(source);
  history.replaceState(null, '', `#${fragment}`);
}

const view = new EditorView({
  parent: byId('editor'),
  extensions: [
    basicSetup,
    dgrLanguage,
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const source = update.state.doc.toString();
      render(source);
      clearTimeout(hashTimer);
      hashTimer = setTimeout(() => void storeInHash(source), 300);
    }),
  ],
});

function load(source: string): void {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
}

async function loadFromAddress(): Promise<void> {
  if (location.hash.slice(1) === fragment && fragment !== '') return;
  const source = await decodeSource(location.hash);
  load(source ?? DEFAULT_SOURCE);
}

const current = () => view.state.doc.toString();
const flush = async () => {
  clearTimeout(hashTimer);
  await storeInHash(current());
  return fragment;
};

byId<HTMLButtonElement>('share').addEventListener('click', async (e) => {
  const button = e.currentTarget as HTMLButtonElement;
  await copy(`${location.origin}/#${await flush()}`, button);
});
byId('embed').addEventListener('click', async () => openEmbedDialog(await flush(), last?.title));
byId('dgr').addEventListener('click', () =>
  download(new Blob([current()], { type: 'text/plain;charset=utf-8' }), `${fileName(last?.title)}.dgr`),
);
byId('svg').addEventListener('click', () => {
  if (last?.svg) download(new Blob([last.svg], { type: 'image/svg+xml' }), `${fileName(last.title)}.svg`);
});
byId<HTMLButtonElement>('png').addEventListener('click', async (e) => {
  const button = e.currentTarget as HTMLButtonElement;
  if (!last?.svg) return;
  button.disabled = true;
  try {
    const { svgToPng } = await import('./png.js');
    download(await svgToPng(last.svg, 2), `${fileName(last.title)}.png`);
  } catch (error) {
    alert(`PNG nicht möglich: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    button.disabled = false;
  }
});

if (import.meta.env.DEV) {
  void import('./local-examples.js').then(({ mountExamples }) => mountExamples(byId('bar'), load));
}

window.addEventListener('hashchange', () => void loadFromAddress());
void loadFromAddress();
