const MIN = 0.1;
const MAX = 8;
const MARGIN = 24;
/** Share of the remaining way to the target scale covered per frame of a gliding zoom. */
const EASE = 0.3;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** What the picture shows: a scale and an offset, moved at once or gliding to a new scale. */
export interface Camera {
  /** Fits the picture to the frame and follows the frame's size until the reader moves or zooms. */
  fit(): void;
  /** Glides to `factor` times the scale around (px, py); further steps add up on the scale still being reached. */
  zoomBy(factor: number, px?: number, py?: number): void;
  /** Zooms at once, for a pinch that already moves smoothly by itself. */
  zoomNow(factor: number, px: number, py: number): void;
  /** Glides to the actual size, with the top of the picture kept in place. */
  actual(): void;
  moveBy(dx: number, dy: number): void;
  /** True while the picture is fitted and follows the frame. */
  following(): boolean;
}

/**
 * The camera over `stage` in `frame`. A gliding zoom keeps the point under the pointer fixed on every frame, so the
 * picture never drifts while it grows or shrinks.
 */
export function createCamera(frame: HTMLElement, stage: HTMLElement, onChange: (scale: number) => void): Camera {
  let scale = 1;
  let x = MARGIN;
  let y = MARGIN;
  let following = true;
  let target = 1;
  let anchorX = 0;
  let anchorY = 0;
  let request = 0;

  const apply = () => {
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    onChange(scale);
  };

  const stop = () => {
    cancelAnimationFrame(request);
    request = 0;
    target = scale;
  };

  /** Sets the scale so that the point (px, py) of the frame shows the same spot of the picture as before. */
  const scaleAt = (next: number, px: number, py: number) => {
    x = px - (px - x) * (next / scale);
    y = py - (py - y) * (next / scale);
    scale = next;
  };

  const glide = () => {
    const remaining = Math.log(target / scale);
    const next = Math.abs(remaining) < 0.002 ? target : scale * Math.exp(remaining * EASE);
    scaleAt(next, anchorX, anchorY);
    apply();
    request = next === target ? 0 : requestAnimationFrame(glide);
  };

  const zoomBy = (factor: number, px = frame.clientWidth / 2, py = frame.clientHeight / 2) => {
    following = false;
    const gliding = request !== 0;
    if (gliding && (px !== anchorX || py !== anchorY)) scaleAt(target, anchorX, anchorY);
    anchorX = px;
    anchorY = py;
    target = clamp((gliding ? target : scale) * factor, MIN, MAX);
    if (!gliding) request = requestAnimationFrame(glide);
  };

  return {
    fit() {
      stop();
      following = true;
      const width = stage.offsetWidth;
      const height = stage.offsetHeight;
      if (width === 0 || height === 0) return apply();
      const fitted = Math.min(1, (frame.clientWidth - 2 * MARGIN) / width, (frame.clientHeight - 2 * MARGIN) / height);
      scale = Math.max(fitted, MIN);
      target = scale;
      x = (frame.clientWidth - width * scale) / 2;
      y = Math.max(MARGIN, (frame.clientHeight - height * scale) / 2);
      apply();
    },
    zoomBy,
    zoomNow(factor, px, py) {
      stop();
      following = false;
      scaleAt(clamp(scale * factor, MIN, MAX), px, py);
      target = scale;
      apply();
    },
    actual() {
      zoomBy(1 / (request !== 0 ? target : scale), frame.clientWidth / 2, MARGIN);
    },
    moveBy(dx, dy) {
      x += dx;
      y += dy;
      following = false;
      apply();
    },
    following: () => following,
  };
}
