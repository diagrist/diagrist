import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { compile, formatMessage, type Plugin } from '@diagrist/core';
import { architecturePlugin } from '@diagrist/plugin-architecture';
import { codePlugin } from '@diagrist/plugin-code';
import { umlPlugin } from '@diagrist/plugin-uml';

/** The plugins of the site, the same as the editor's: every kind the docs describe can be drawn. */
export const plugins: readonly Plugin[] = [umlPlugin, architecturePlugin, codePlugin];

/** The live editor; a link carries the source in the fragment, which browsers never send to a server. */
const EDITOR = 'https://live.diagrist.com/';

/** A picture for the site: the SVG, scoped so that several on one page keep their own styles, and its description. */
export interface Rendered {
  readonly svg: string;
  readonly description?: string;
}

/**
 * Renders a source or throws with every finding, so a broken or doubtful example fails the build instead of
 * reaching the site. `where` names the place in the error, such as `getting-started.md:42`.
 */
export function renderDgr(source: string, where: string): Rendered {
  const result = compile(source, { plugins });
  if (result.svg === undefined || result.diagnostics.length > 0) {
    const lines = result.diagnostics.map(
      (d) => `  ${where}+${d.span.line}:${d.span.column} ${d.code} ${formatMessage(d, plugins, 'en')}`,
    );
    throw new Error(`Diagrist: the diagram at ${where} does not compile cleanly\n${lines.join('\n')}`);
  }
  return {
    svg: scoped(result.svg, `dia-${createHash('sha256').update(source).digest('hex').slice(0, 8)}`),
    ...(result.description === undefined ? {} : { description: result.description }),
  };
}

/**
 * An inline SVG's stylesheet applies to the whole page, and its marker ids are global. Renaming the root class
 * `dia` and the markers `m-…` after the source keeps two pictures of different kinds apart.
 */
export function scoped(svg: string, name: string): string {
  return svg
    .replace('class="dia"', `class="dia ${name}"`)
    .replace(/<style>[\s\S]*?<\/style>/, (style) => style.replace(/\.dia\b/g, `.${name}`))
    .replace(/id="m-/g, `id="${name}-m-`)
    .replace(/url\(#m-/g, `url(#${name}-m-`);
}

/** The editor with this source, in the same `#v1:` form the editor writes: deflate-raw, then base64url. */
export function editorLink(source: string): string {
  return `${EDITOR}#v1:${deflateRawSync(Buffer.from(source, 'utf8')).toString('base64url')}`;
}
