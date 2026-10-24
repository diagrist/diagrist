import { inflateSync } from 'node:zlib';
import { type Scene, type Styles, toSvg } from '@diagrist/core';

/** Decoded RGBA pixels of a PNG as resvg writes it: 8 bits per channel, colour type 6, not interlaced. */
export interface Picture {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

/** Reads a PNG from its bytes, so tests check what was encoded rather than what the API reports. */
export function decodePng(png: Uint8Array): Picture {
  const bytes = Buffer.from(png);
  const chunks: Buffer[] = [];
  let width = 0;
  let height = 0;
  for (let at = 8; at < bytes.length; at += 12 + bytes.readUInt32BE(at)) {
    const type = bytes.toString('latin1', at + 4, at + 8);
    const data = bytes.subarray(at + 8, at + 8 + bytes.readUInt32BE(at));
    if (type === 'IHDR') {
      [width, height] = [data.readUInt32BE(0), data.readUInt32BE(4)];
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('expected 8-bit RGBA without interlace');
    }
    if (type === 'IDAT') chunks.push(data);
  }
  return { width, height, rgba: unfilter(inflateSync(Buffer.concat(chunks)), width, height) };
}

function unfilter(raw: Uint8Array, width: number, height: number): Uint8Array {
  const stride = width * 4;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const left = i >= 4 ? (out[y * stride + i - 4] ?? 0) : 0;
      const up = y > 0 ? (out[(y - 1) * stride + i] ?? 0) : 0;
      const corner = i >= 4 && y > 0 ? (out[(y - 1) * stride + i - 4] ?? 0) : 0;
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, corner)][filter ?? 0] ?? 0;
      out[y * stride + i] = ((raw[y * (stride + 1) + 1 + i] ?? 0) + predictor) & 255;
    }
  }
  return out;
}

function paeth(left: number, up: number, corner: number): number {
  const p = left + up - corner;
  const [a, b, c] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
  return a <= b && a <= c ? left : b <= c ? up : corner;
}

/** The pixel at `x`, `y` as `[r, g, b, a]`. */
export const pixel = (picture: Picture, x: number, y: number): number[] => [
  ...picture.rgba.subarray((y * picture.width + x) * 4, (y * picture.width + x) * 4 + 4),
];

/** Opaque, dark pixels in rows `from` to `to`: where text was drawn on the light canvas. */
export function inkInRows(picture: Picture, from: number, to: number): number {
  let ink = 0;
  for (let y = from; y < to; y++) {
    for (let x = 0; x < picture.width; x++) {
      const [r = 255, g = 255, b = 255, a = 0] = pixel(picture, x, y);
      if (a > 128 && r < 128 && g < 128 && b < 128) ink++;
    }
  }
  return ink;
}

const styles: Styles = {
  root: 'dia',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 20,
  canvas: '#fafafa',
  markerSize: 12,
  markers: [],
  roles: { regular: { classes: ['ink'] }, bold: { classes: ['ink', 'strong'] } },
  rules: [
    { name: 'ink', declarations: 'fill: #18181b;' },
    { name: 'strong', declarations: 'font-weight: 700;' },
  ],
  fonts: { body: { size: 20 }, heading: { size: 20, weight: 700 } },
};

/** The kernel's SVG of a 200 x 60 picture: the same word in regular in the upper half, in bold in the lower. */
export function kernelSvg(options: { readonly inline?: boolean } = {}): string {
  const scene: Scene = {
    width: 200,
    height: 60,
    title: 'Two weights',
    children: [
      { kind: 'text', x: 10, y: 24, text: 'Hamburg', role: 'regular', font: 'body' },
      { kind: 'text', x: 10, y: 54, text: 'Hamburg', role: 'bold', font: 'heading' },
    ],
  };
  return toSvg(scene, styles, options);
}
