import { compile, formatMessage } from '@diagrist/core';
import { architecturePlugin } from '@diagrist/plugin-architecture';
import { codePlugin } from '@diagrist/plugin-code';
import { umlPlugin } from '@diagrist/plugin-uml';
import type { Finding, Request, Response } from './protocol.js';

/**
 * Compiles off the main thread, so typing stays smooth while a large class diagram searches its arrangement.
 * Everything happens here in the browser; the worker has no network access of its own to use.
 */
const plugins = [umlPlugin, architecturePlugin, codePlugin];

/** Inside a worker, `self` posts to the page that started it, like the page's handle on the worker. */
const page = self as unknown as Worker;

page.onmessage = (event: MessageEvent<Request>) => {
  const { id, source } = event.data;
  const result = compile(source, { plugins });
  const findings: Finding[] = result.diagnostics.map((d) => ({
    code: d.code,
    severity: d.severity,
    line: d.span.line,
    column: d.span.column,
    length: d.span.length,
    message: formatMessage(d, plugins, result.locale),
  }));
  const title = /aria-label="([^"]*)"/.exec(result.svg ?? '')?.[1];
  const response: Response = {
    id,
    findings,
    ...(result.svg === undefined ? {} : { svg: result.svg }),
    ...(title ? { title } : {}),
  };
  page.postMessage(response);
};
