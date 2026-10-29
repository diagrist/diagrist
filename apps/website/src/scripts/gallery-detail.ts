import { highlight } from '../lib/highlight.js';

/** What `/gallery/<slug>.json` holds: the source, the picture and the editor's address when it can draw it. */
interface Detail {
  readonly source: string;
  readonly svg: string;
  readonly editor?: string;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const dialog = byId<HTMLDialogElement>('gallery-detail');
const picture = byId('detail-picture');
const code = byId('detail-code');
const editor = byId<HTMLAnchorElement>('detail-editor');
const copy = byId<HTMLButtonElement>('detail-copy');
const cards = [...document.querySelectorAll<HTMLAnchorElement>('.gallery-card')];
const loaded = new Map<string, Promise<Detail>>();

let current: HTMLAnchorElement | undefined;
let source = '';

const fetched = (slug: string): Promise<Detail> => {
  let detail = loaded.get(slug);
  if (detail === undefined) {
    detail = fetch(`/gallery/${slug}.json`).then((response) => response.json() as Promise<Detail>);
    loaded.set(slug, detail);
  }
  return detail;
};

/** Shows a card's example: the texts at once, picture and source as soon as they arrive. */
async function open(card: HTMLAnchorElement): Promise<void> {
  current = card;
  const slug = card.dataset.slug ?? '';
  byId('detail-title').textContent = card.dataset.title ?? '';
  byId('detail-tags').textContent = [card.dataset.kind, card.dataset.look].filter(Boolean).join(' · ');
  byId('detail-file').textContent = card.dataset.file ?? '';
  byId<HTMLAnchorElement>('detail-github').href = card.dataset.github ?? '';
  byId<HTMLAnchorElement>('detail-svg').href = `/gallery/${slug}.svg`;
  byId<HTMLAnchorElement>('detail-svg').download = `${slug.split('/').at(-1)}.svg`;
  picture.classList.remove('actual');
  picture.innerHTML = '';
  code.textContent = '';
  copy.disabled = true;
  history.replaceState(history.state, '', `${location.pathname}${location.search}#${slug}`);
  if (!dialog.open) dialog.showModal();
  const detail = await fetched(slug);
  if (current !== card) return;
  source = detail.source;
  picture.innerHTML = detail.svg;
  grow(picture.querySelector('svg'));
  code.innerHTML = highlight(detail.source);
  copy.disabled = false;
  editor.hidden = detail.editor === undefined;
  byId('detail-files').hidden = detail.editor !== undefined;
  if (detail.editor !== undefined) editor.href = detail.editor;
  void prefetch(1);
}

/** The picture fills the window, but grows to at most 1.6 times its own size so a small one stays readable. */
function grow(svg: SVGSVGElement | null): void {
  if (svg === null) return;
  svg.style.setProperty('--most-width', `${svg.width.baseVal.value * 1.6}px`);
  svg.style.setProperty('--most-height', `${svg.height.baseVal.value * 1.6}px`);
}

/** The visible card `step` places away from the open one, wrapping around at the ends. */
function neighbour(step: number): HTMLAnchorElement | undefined {
  const visible = cards.filter((card) => !card.hidden);
  if (current === undefined || visible.length === 0) return undefined;
  const index = visible.indexOf(current);
  return visible[(index + step + visible.length) % visible.length];
}

async function prefetch(step: number): Promise<void> {
  const next = neighbour(step)?.dataset.slug;
  if (next !== undefined) await fetched(next);
}

const go = (step: number) => {
  const next = neighbour(step);
  if (next !== undefined) void open(next);
};

for (const card of cards) {
  card.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    void open(card);
  });
}
byId('detail-prev').addEventListener('click', () => go(-1));
byId('detail-next').addEventListener('click', () => go(1));
byId('detail-close').addEventListener('click', () => dialog.close());
picture.addEventListener('click', () => picture.classList.toggle('actual'));
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') go(-1);
  if (event.key === 'ArrowRight') go(1);
});
dialog.addEventListener('close', () => {
  history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  current?.focus();
  current = undefined;
});
copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(source);
  copy.textContent = 'Copied';
  setTimeout(() => {
    copy.textContent = 'Copy source';
  }, 1200);
});

/** An address that names an example, such as `/gallery/#uml/sequence/cache`, opens it. */
function fromAddress(): void {
  const slug = decodeURIComponent(location.hash.slice(1));
  const card = cards.find((c) => c.dataset.slug === slug);
  if (card !== undefined && card !== current) void open(card);
}
window.addEventListener('hashchange', fromAddress);
fromAddress();
