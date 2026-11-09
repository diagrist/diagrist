import { inflateSync } from 'node:zlib';

/** RGBA pixels of a PNG as resvg writes it: 8 bits per channel, colour type 6, not interlaced. */
interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

/** Reads the pixels of a PNG from its bytes. */
export function decodePng(png: Uint8Array): Pixels {
  const bytes = Buffer.from(png);
  const chunks: Buffer[] = [];
  let width = 0;
  let height = 0;
  for (let at = 8; at < bytes.length; at += 12 + bytes.readUInt32BE(at)) {
    const type = bytes.toString('latin1', at + 4, at + 8);
    const data = bytes.subarray(at + 8, at + 8 + bytes.readUInt32BE(at));
    if (type === 'IHDR') [width, height] = [data.readUInt32BE(0), data.readUInt32BE(4)];
    if (type === 'IDAT') chunks.push(data);
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const rgba = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)] ?? 0;
    for (let i = 0; i < stride; i++) {
      const left = i >= 4 ? (rgba[y * stride + i - 4] ?? 0) : 0;
      const up = y > 0 ? (rgba[(y - 1) * stride + i] ?? 0) : 0;
      const corner = i >= 4 && y > 0 ? (rgba[(y - 1) * stride + i - 4] ?? 0) : 0;
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, corner)][filter] ?? 0;
      rgba[y * stride + i] = ((raw[y * (stride + 1) + 1 + i] ?? 0) + predictor) & 255;
    }
  }
  return { width, height, rgba };
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** How many pixels differ by more than `tolerance` in any channel; pictures of different sizes differ everywhere. */
export function differingPixels(a: Pixels, b: Pixels, tolerance = 24): number {
  if (a.width !== b.width || a.height !== b.height) return Math.max(a.width * a.height, b.width * b.height);
  let differing = 0;
  for (let i = 0; i < a.rgba.length; i += 4) {
    for (let channel = 0; channel < 4; channel++) {
      if (Math.abs((a.rgba[i + channel] ?? 0) - (b.rgba[i + channel] ?? 0)) > tolerance) {
        differing++;
        break;
      }
    }
  }
  return differing;
}
