/**
 * The source travels in the fragment of the address (`#v1:…`). Browsers never send the fragment to a server,
 * neither in the request nor in the Referer, so a diagram reaches no one but the people who hold the link.
 * `v1` is UTF-8, raw deflate, base64url without padding.
 */
const PREFIX = 'v1:';

/** Packs a source into a fragment, without the leading `#`. */
export async function encodeSource(source: string): Promise<string> {
  const packed = await pipe(new TextEncoder().encode(source), new CompressionStream('deflate-raw'));
  return PREFIX + toBase64Url(packed);
}

/** Unpacks a fragment, with or without `#`; undefined when it holds no source in a known form. */
export async function decodeSource(fragment: string): Promise<string | undefined> {
  const text = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (!text.startsWith(PREFIX)) return undefined;
  try {
    const bytes = await pipe(fromBase64Url(text.slice(PREFIX.length)), new DecompressionStream('deflate-raw'));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
