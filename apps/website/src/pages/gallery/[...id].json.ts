import type { APIRoute, GetStaticPaths } from 'astro';
import { examples } from '../../lib/gallery.js';
import { editorLink } from '../../lib/render.js';

/**
 * What the gallery's detail view shows of an example, fetched when it opens: the source, the picture and, when the
 * live editor can draw it, the editor's address with the source.
 */
export const getStaticPaths: GetStaticPaths = () =>
  examples().map((example) => ({ params: { id: example.slug }, props: { example } }));

export const GET: APIRoute = ({ props }) => {
  const { source, svg, editable } = props.example;
  return Response.json({ source, svg, ...(editable ? { editor: editorLink(source) } : {}) });
};
