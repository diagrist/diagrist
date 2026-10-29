import type { Code, Html, Root } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';
import { editorLink, renderDgr } from './render.js';

/** The fence meta that asks for a picture: ` ```dgr picture `. Other `dgr` fences, like statement examples, stay code. */
const PICTURE = 'picture';

const escaped = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/**
 * A remark plugin: a ` ```dgr picture ` fence is drawn when the site builds, shown above its source with a link that
 * opens it in the editor. A fence that does not compile without findings stops the build with the findings.
 */
export function remarkDiagrist() {
  return (tree: Root, file: { path?: string }) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'dgr' || node.meta?.trim() !== PICTURE || parent === undefined || index === undefined) return;
      const where = `${file.path ?? 'markdown'}:${node.position?.start.line ?? 0}`;
      const { svg, description } = renderDgr(node.value, where);
      const picture: Html = {
        type: 'html',
        value: [
          '<figure class="dgr-figure not-content">',
          `<div class="dgr-picture">${svg}</div>`,
          description === undefined ? '' : `<figcaption class="sr-only">${escaped(description)}</figcaption>`,
          '</figure>',
        ].join(''),
      };
      const source: Code = { type: 'code', lang: 'dgr', value: node.value };
      const link: Html = {
        type: 'html',
        value: `<p class="dgr-open"><a href="${escaped(editorLink(node.value))}">Open in the editor ↗</a></p>`,
      };
      parent.children.splice(index, 1, picture, source, link);
      return [SKIP, index + 3];
    });
  };
}
