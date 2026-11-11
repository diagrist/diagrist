import { type Camera, createCamera } from './camera.js';

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

/** One click on a zoom button or one key press. */
const STEP = 1.2;
/** One notch of a mouse wheel with Ctrl or Cmd. */
const NOTCH = 1.1;
/** Zoom per pixel of a pinch on a trackpad, which delivers many small deltas. */
const PINCH = 0.01;
/** The largest change of a single pinch event, so that a jerky gesture does not jump. */
const PINCH_LIMIT = 1.15;

/** A wheel delta in pixels, whatever unit the browser reports (Firefox reports lines for a mouse wheel). */
function pixels(event: WheelEvent, delta: number, page: number): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * page;
  return delta;
}

/** A mouse wheel turns in notches of about 100 pixels or whole lines; a trackpad sends small, fractional deltas. */
function isNotch(event: WheelEvent): boolean {
  if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return true;
  return Math.abs(event.deltaY) >= 50 && Number.isInteger(event.deltaY);
}

/**
 * Pan and zoom for the picture. It starts fitted to the frame and stays fitted while the source changes, until the
 * reader zooms or drags; Fit returns to that. Dragging moves the picture, Ctrl or a pinch with the wheel zooms at the
 * pointer, the plain wheel moves it, and the keys `+`, `-`, `0` and `1` work while no field has the focus. Buttons,
 * keys and mouse wheel notches glide in small steps; a pinch follows the fingers directly.
 */
export function createViewport(controls: Controls): ShowPicture {
  const { frame, level } = controls;
  const stage = document.createElement('div');
  stage.className = 'stage';
  frame.append(stage);
  const camera = createCamera(frame, stage, (scale) => {
    level.value = `${Math.round(scale * 100)} %`;
    controls.fit.setAttribute('aria-pressed', String(camera.following()));
  });

  controls.zoomIn.addEventListener('click', () => camera.zoomBy(STEP));
  controls.zoomOut.addEventListener('click', () => camera.zoomBy(1 / STEP));
  controls.fit.addEventListener('click', () => camera.fit());
  controls.actual.addEventListener('click', () => camera.actual());
  listenToWheel(frame, camera);
  listenToDrag(frame, camera);
  listenToKeys(camera);

  new ResizeObserver(() => {
    if (camera.following()) camera.fit();
  }).observe(frame);

  return (svg, refit) => {
    stage.innerHTML = svg;
    if (refit || camera.following()) camera.fit();
    else camera.moveBy(0, 0);
  };
}

/** The wheel and trackpad, including Safari, which reports a pinch as gesture events with a running scale. */
function listenToWheel(frame: HTMLElement, camera: Camera): void {
  let gesturing = false;
  let gestureScale = 1;
  const at = (event: { clientX: number; clientY: number }) => {
    const box = frame.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top] as const;
  };

  frame.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const [px, py] = at(event);
      if (event.ctrlKey || event.metaKey) {
        if (gesturing) return;
        if (isNotch(event)) return camera.zoomBy(event.deltaY < 0 ? NOTCH : 1 / NOTCH, px, py);
        const factor = Math.min(PINCH_LIMIT, Math.max(1 / PINCH_LIMIT, Math.exp(-event.deltaY * PINCH)));
        return camera.zoomNow(factor, px, py);
      }
      const dx = pixels(event, event.deltaX, frame.clientWidth);
      const dy = pixels(event, event.deltaY, frame.clientHeight);
      if (event.shiftKey && dx === 0) camera.moveBy(-dy, 0);
      else camera.moveBy(-dx, -dy);
    },
    { passive: false },
  );

  type Gesture = Event & { scale: number; clientX: number; clientY: number };
  frame.addEventListener('gesturestart', (event) => {
    event.preventDefault();
    gesturing = true;
    gestureScale = 1;
  });
  frame.addEventListener('gesturechange', (event) => {
    event.preventDefault();
    const gesture = event as Gesture;
    camera.zoomNow(gesture.scale / gestureScale, ...at(gesture));
    gestureScale = gesture.scale;
  });
  frame.addEventListener('gestureend', (event) => {
    event.preventDefault();
    gesturing = false;
  });
}

/**
 * Dragging moves the picture. The press starts no text selection, neither in the picture nor in the source beside
 * it, and no drag and drop of the drawing's texts.
 */
function listenToDrag(frame: HTMLElement, camera: Camera): void {
  frame.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    frame.setPointerCapture(event.pointerId);
    frame.classList.add('dragging');
    document.body.classList.add('panning');
    let lastX = event.clientX;
    let lastY = event.clientY;
    const done = new AbortController();
    const mine = { signal: done.signal };
    frame.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerId !== event.pointerId) return;
        camera.moveBy(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX;
        lastY = e.clientY;
      },
      mine,
    );
    const end = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      frame.classList.remove('dragging');
      document.body.classList.remove('panning');
      done.abort();
    };
    frame.addEventListener('pointerup', end, mine);
    frame.addEventListener('pointercancel', end, mine);
    frame.addEventListener('lostpointercapture', end, mine);
  });
  frame.addEventListener('dragstart', (event) => event.preventDefault());
  frame.addEventListener('selectstart', (event) => event.preventDefault());
}

function listenToKeys(camera: Camera): void {
  document.addEventListener('keydown', (event) => {
    if ((event.target as Element).closest('.cm-editor, input, textarea, select, dialog')) return;
    const keys: Record<string, () => void> = {
      '+': () => camera.zoomBy(STEP),
      '=': () => camera.zoomBy(STEP),
      '-': () => camera.zoomBy(1 / STEP),
      '0': () => camera.fit(),
      '1': () => camera.actual(),
    };
    const action = keys[event.key];
    if (action === undefined || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    action();
  });
}
