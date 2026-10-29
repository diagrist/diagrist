import type { Request, Response } from './protocol.js';

/** Compiles in a worker; only the answer to the latest source is delivered, older ones are dropped. */
export function createRenderer(onResult: (result: Response) => void): (source: string) => void {
  const worker = new Worker(new URL('./compile-worker.ts', import.meta.url), { type: 'module' });
  let latest = 0;
  worker.onmessage = (event: MessageEvent<Response>) => {
    if (event.data.id === latest) onResult(event.data);
  };
  return (source) => {
    latest += 1;
    const request: Request = { id: latest, source };
    worker.postMessage(request);
  };
}
