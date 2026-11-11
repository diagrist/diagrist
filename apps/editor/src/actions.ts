/** Saves a blob under a file name, without any request: the blob URL lives in this page only. */
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A file name from the diagram's title, e.g. `Aktionäre einer Stadt` becomes `aktionaere-einer-stadt`. */
export function fileName(title: string | undefined): string {
  const base = (title ?? 'diagram')
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'diagram';
}

/** Shows `text` on an element for a moment, e.g. a confirmation on the button that copied something. */
export function flash(element: HTMLElement, text: string): void {
  const label = element.dataset.label ?? element.textContent ?? '';
  element.dataset.label = label;
  element.textContent = text;
  clearTimeout(Number(element.dataset.timer));
  element.dataset.timer = String(
    setTimeout(() => {
      element.textContent = label;
      delete element.dataset.label;
    }, 1200),
  );
}

/** Copies a text and confirms on the button for a moment. */
export async function copy(text: string, button: HTMLElement): Promise<void> {
  await navigator.clipboard.writeText(text);
  flash(button, 'Copied');
}

/**
 * Copies the SVG as a picture where the browser can (`image/svg+xml`) and always as text, so that design tools,
 * editors and chats can all paste it.
 */
export async function copySvg(svg: string): Promise<void> {
  const asPicture = typeof ClipboardItem !== 'undefined' && ClipboardItem.supports?.('image/svg+xml') === true;
  if (!asPicture) return navigator.clipboard.writeText(svg);
  await navigator.clipboard.write([
    new ClipboardItem({
      'image/svg+xml': new Blob([svg], { type: 'image/svg+xml' }),
      'text/plain': new Blob([svg], { type: 'text/plain' }),
    }),
  ]);
}

/**
 * Copies a PNG that is still being drawn. The clipboard gets the promise at once: Safari allows writing only within
 * the click, not after the picture is ready.
 */
export async function copyPng(png: Promise<Blob>): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

/** Fills and opens the embed dialog for the current fragment. */
export function openEmbedDialog(fragment: string, title: string | undefined): void {
  const url = new URL(`/embed#${fragment}`, location.origin).href;
  const html = `<iframe src="${url}" title="${(title ?? 'Diagram').replaceAll('"', '&quot;')}" width="100%" height="480" style="border:0"></iframe>`;
  const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  byId<HTMLTextAreaElement>('embed-url').value = url;
  byId<HTMLTextAreaElement>('embed-html').value = html;
  byId('embed-size').textContent = `Length of the address: ${url.length.toLocaleString('en')} characters.`;
  byId<HTMLButtonElement>('copy-url').onclick = (e) => copy(url, e.currentTarget as HTMLButtonElement);
  byId<HTMLButtonElement>('copy-html').onclick = (e) => copy(html, e.currentTarget as HTMLButtonElement);
  byId<HTMLDialogElement>('embed-dialog').showModal();
}
