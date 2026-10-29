import './fonts.css';
import './style.css';
import { showFindings } from './findings.js';
import { createRenderer } from './renderer.js';
import { decodeSource } from './source-hash.js';

/**
 * The bare picture for iframes, e.g. in Confluence. The source comes from the fragment and is compiled here in the
 * browser; the page sends nothing anywhere.
 */
const preview = document.getElementById('preview') as HTMLElement;
const findings = document.getElementById('findings') as HTMLElement;
const edit = document.getElementById('edit') as HTMLAnchorElement;

const render = createRenderer((result) => {
  preview.innerHTML = result.svg ?? '';
  const errors = result.svg === undefined ? result.findings : [];
  showFindings(findings, errors);
  if (result.title) document.title = `${result.title} · Diagrist`;
});

async function show(): Promise<void> {
  edit.href = `/${location.hash}`;
  const source = await decodeSource(location.hash);
  if (source === undefined) {
    preview.innerHTML = '';
    findings.replaceChildren(
      Object.assign(document.createElement('li'), { textContent: 'Kein Diagramm in der Adresse.' }),
    );
    return;
  }
  render(source);
}

window.addEventListener('hashchange', () => void show());
void show();
