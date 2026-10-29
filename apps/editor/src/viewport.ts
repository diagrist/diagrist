/** The controls of the picture: the frame it moves in, the zoom buttons and the label with the scale. */
interface Controls {
  readonly frame: HTMLElement;
  readonly zoomIn: HTMLButtonElement;
  readonly zoomOut: HTMLButtonElement;
  readonly fit: HTMLButtonElement;
  readonly actual: HTMLButtonElement;
  readonly level: HTMLOutputElement;
}

/** Shows a picture in the frame; `refit` fits it even after the reader zoomed, as for a newly loaded example. */
export type ShowPicture = (svg: string, refit: boolean) => void;

const MIN = 0.1;
const MAX = 8;
const STEP = 1.25;
const MARGIN = 24;

/**
 * Pan and zoom for the picture. It starts fitted to the frame and stays fitted while the source changes, until the
 * reader zooms or drags; Fit returns to that. Dragging moves the picture, Ctrl or a pinch with the wheel zooms at the
 * pointer, the plain wheel moves it, and the keys `+`, `-`, `0` and `1` work while no field has the focus.
 */
export function createViewport(controls: Controls): ShowPicture {
  const { frame, level } = controls;
  const stage = document.createElement('div');
  stage.className = 'stage';
  frame.append(stage);
  let scale = 1;
  let x = MARGIN;
  let y = MARGIN;
  let following = true;

  const apply = () => {
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    level.value = `${Math.round(scale * 100)} %`;
    controls.fit.setAttribute('aria-pressed', String(following));
  };

  const fit = () => {
    following = true;
    const width = stage.offsetWidth;
    const height = stage.offsetHeight;
    if (width === 0 || height === 0) return apply();
    scale = Math.min(1, (frame.clientWidth - 2 * MARGIN) / width, (frame.clientHeight - 2 * MARGIN) / height);
    scale = Math.max(scale, MIN);
    x = (frame.clientWidth - width * scale) / 2;
    y = Math.max(MARGIN, (frame.clientHeight - height * scale) / 2);
    apply();
  };

  const zoomAt = (factor: number, px = frame.clientWidth / 2, py = frame.clientHeight / 2) => {
    const next = Math.min(MAX, Math.max(MIN, scale * factor));
    x = px - (px - x) * (next / scale);
    y = py - (py - y) * (next / scale);
    scale = next;
    following = false;
    apply();
  };

  const actual = () => zoomAt(1 / scale, frame.clientWidth / 2, MARGIN);

  controls.zoomIn.addEventListener('click', () => zoomAt(STEP));
  controls.zoomOut.addEventListener('click', () => zoomAt(1 / STEP));
  controls.fit.addEventListener('click', fit);
  controls.actual.addEventListener('click', actual);

  frame.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const box = frame.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) {
        zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX - box.left, event.clientY - box.top);
        return;
      }
      x -= event.deltaX;
      y -= event.deltaY;
      following = false;
      apply();
    },
    { passive: false },
  );

  frame.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    frame.setPointerCapture(event.pointerId);
    frame.classList.add('dragging');
    let lastX = event.clientX;
    let lastY = event.clientY;
    const move = (e: PointerEvent) => {
      x += e.clientX - lastX;
      y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      following = false;
      apply();
    };
    const end = () => {
      frame.classList.remove('dragging');
      frame.removeEventListener('pointermove', move);
    };
    frame.addEventListener('pointermove', move);
    frame.addEventListener('pointerup', end, { once: true });
    frame.addEventListener('pointercancel', end, { once: true });
  });

  document.addEventListener('keydown', (event) => {
    if ((event.target as Element).closest('.cm-editor, input, textarea, select, dialog')) return;
    const keys: Record<string, () => void> = {
      '+': () => zoomAt(STEP),
      '=': () => zoomAt(STEP),
      '-': () => zoomAt(1 / STEP),
      '0': fit,
      '1': actual,
    };
    const action = keys[event.key];
    if (action === undefined || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    action();
  });

  new ResizeObserver(() => {
    if (following) fit();
  }).observe(frame);

  return (svg, refit) => {
    stage.innerHTML = svg;
    if (refit || following) fit();
    else apply();
  };
}
