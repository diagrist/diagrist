/** The share of the source in percent of the width, the only thing the editor keeps in the browser's storage. */
const KEY = 'diagrist.editor.split';
const MIN = 20;
const MAX = 80;

/**
 * The divider between source and picture: dragged with the pointer or moved with the arrow keys, Home and End, as
 * the separator pattern of WAI-ARIA describes it. The width is remembered for the next visit.
 */
export function makeResizable(split: HTMLElement, divider: HTMLElement): void {
  const set = (share: number) => {
    const clamped = Math.round(Math.min(MAX, Math.max(MIN, share)));
    split.style.setProperty('--source', `${clamped}%`);
    divider.setAttribute('aria-valuenow', String(clamped));
    return clamped;
  };
  const store = (share: number) => {
    try {
      localStorage.setItem(KEY, String(share));
    } catch {
      return;
    }
  };
  let share = set(Number(readStored()) || 40);

  divider.addEventListener('pointerdown', (event) => {
    divider.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const box = split.getBoundingClientRect();
      share = set(((e.clientX - box.left) / box.width) * 100);
    };
    const end = () => {
      divider.removeEventListener('pointermove', move);
      store(share);
    };
    divider.addEventListener('pointermove', move);
    divider.addEventListener('pointerup', end, { once: true });
    divider.addEventListener('pointercancel', end, { once: true });
  });

  divider.addEventListener('keydown', (event) => {
    const keys: Record<string, number> = { ArrowLeft: share - 5, ArrowRight: share + 5, Home: MIN, End: MAX };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    share = set(next);
    store(share);
  });
}

function readStored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** On a narrow screen only one side fits: two buttons switch between the source and the picture. */
export function makeSwitch(split: HTMLElement, source: HTMLButtonElement, picture: HTMLButtonElement): void {
  const show = (side: 'source' | 'picture') => {
    split.dataset.show = side;
    source.setAttribute('aria-pressed', String(side === 'source'));
    picture.setAttribute('aria-pressed', String(side === 'picture'));
  };
  source.addEventListener('click', () => show('source'));
  picture.addEventListener('click', () => show('picture'));
}
