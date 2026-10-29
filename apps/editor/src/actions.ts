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
  const base = (title ?? 'diagramm')
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'diagramm';
}

/** Copies a text and confirms on the button for a moment. */
export async function copy(text: string, button: HTMLButtonElement): Promise<void> {
  await navigator.clipboard.writeText(text);
  const label = button.textContent;
  button.textContent = 'Kopiert';
  setTimeout(() => {
    button.textContent = label;
  }, 1200);
}

/** Fills and opens the embed dialog for the current fragment. */
export function openEmbedDialog(fragment: string, title: string | undefined): void {
  const url = new URL(`/embed#${fragment}`, location.origin).href;
  const html = `<iframe src="${url}" title="${(title ?? 'Diagramm').replaceAll('"', '&quot;')}" width="100%" height="480" style="border:0"></iframe>`;
  const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  byId<HTMLTextAreaElement>('embed-url').value = url;
  byId<HTMLTextAreaElement>('embed-html').value = html;
  byId('embed-size').textContent = `Länge der Adresse: ${url.length.toLocaleString('de-DE')} Zeichen.`;
  byId<HTMLButtonElement>('copy-url').onclick = (e) => copy(url, e.currentTarget as HTMLButtonElement);
  byId<HTMLButtonElement>('copy-html').onclick = (e) => copy(html, e.currentTarget as HTMLButtonElement);
  byId<HTMLDialogElement>('embed-dialog').showModal();
}
