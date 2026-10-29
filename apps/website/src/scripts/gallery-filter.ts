/**
 * The gallery's filter: one kind at a time and a search over title, kind, file and folder. Both live in the
 * address as `?kind=` and `?q=`, so a filtered gallery can be shared; the fragment stays the open example's.
 */
const search = document.querySelector<HTMLInputElement>('#gallery-search');
const chips = [...document.querySelectorAll<HTMLButtonElement>('.gallery-chips button')];
const cards = [...document.querySelectorAll<HTMLAnchorElement>('.gallery-card')];
const sections = [...document.querySelectorAll<HTMLElement>('.gallery-group')];
const count = document.querySelector<HTMLElement>('#gallery-count');
const empty = document.querySelector<HTMLElement>('#gallery-empty');

const params = new URLSearchParams(location.search);
let kind = params.get('kind') ?? '';
if (search !== null) search.value = params.get('q') ?? '';

function apply(): void {
  const words = (search?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const card of cards) {
    const text = card.dataset.search ?? '';
    const visible = (kind === '' || card.dataset.kind === kind) && words.every((word) => text.includes(word));
    card.hidden = !visible;
    if (visible) shown += 1;
  }
  for (const section of sections) section.hidden = section.querySelector('.gallery-card:not([hidden])') === null;
  for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.kind === kind));
  if (count !== null) count.textContent = shown === cards.length ? `${shown} examples` : `${shown} of ${cards.length}`;
  if (empty !== null) empty.hidden = shown > 0;
}

function remember(): void {
  const next = new URLSearchParams();
  if (kind !== '') next.set('kind', kind);
  if (search?.value) next.set('q', search.value);
  const query = next.toString();
  history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
}

for (const chip of chips) {
  chip.addEventListener('click', () => {
    kind = chip.dataset.kind ?? '';
    apply();
    remember();
  });
}
search?.addEventListener('input', () => {
  apply();
  remember();
});
apply();
