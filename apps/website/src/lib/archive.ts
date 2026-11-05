import { createHash } from 'node:crypto';
import { crc32, deflateRawSync, gzipSync } from 'node:zlib';

/**
 * Archives of a folder as agents install it: a `.tar.gz` and a `.zip` with the files at the root of the archive,
 * no wrapping folder and no directory entries. Every file is dated 1980-01-01 and owned by nobody, so the same
 * files give the same bytes and the same digest on every build.
 */

/** The files of a folder by their path inside it, such as `SKILL.md` or `reference/class.md`. */
export type Files = ReadonlyMap<string, Uint8Array>;

/** 1980-01-01 00:00 UTC, the earliest moment a zip can hold, in seconds since 1970. */
const EPOCH = 315532800;

const sorted = (files: Files): [string, Uint8Array][] => [...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/** The digest of an artifact as the discovery index writes it, `sha256:` and 64 hex digits. */
export const digestOf = (bytes: Uint8Array): string => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

/** A ustar header of one regular file. */
function tarHeader(path: string, size: number): Uint8Array {
  const name = new TextEncoder().encode(path);
  if (name.length > 100) throw new Error(`The path ${path} is longer than a tar name of 100 bytes.`);
  const header = new Uint8Array(512);
  const put = (at: number, text: string) => header.set(new TextEncoder().encode(text), at);
  const octal = (at: number, width: number, value: number) =>
    put(at, `${value.toString(8).padStart(width - 1, '0')}\0`);
  header.set(name, 0);
  octal(100, 8, 0o644);
  octal(108, 8, 0);
  octal(116, 8, 0);
  octal(124, 12, size);
  octal(136, 12, EPOCH);
  put(148, '        ');
  put(156, '0');
  put(257, 'ustar\u000000');
  const sum = header.reduce((total, byte) => total + byte, 0);
  put(148, `${sum.toString(8).padStart(6, '0')}\0 `);
  return header;
}

/** The files as a gzipped tar. */
export function tarGz(files: Files): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const [path, bytes] of sorted(files)) {
    parts.push(tarHeader(path, bytes.length), bytes, new Uint8Array((512 - (bytes.length % 512)) % 512));
  }
  parts.push(new Uint8Array(1024));
  return gzipSync(Buffer.concat(parts), { level: 9 });
}

/** The files as a zip, each deflated, with UTF-8 names. */
export function zip(files: Files): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [path, bytes] of sorted(files)) {
    const name = Buffer.from(path, 'utf8');
    const data = deflateRawSync(bytes, { level: 9 });
    const crc = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    local.copy(central, 8, 6, 30);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
