import type { APIRoute, GetStaticPaths } from 'astro';
import { examples } from '../../lib/gallery.js';

/** The picture of every example as a file, so the gallery loads them lazily and a new tab can show one alone. */
export const getStaticPaths: GetStaticPaths = () =>
  examples().map((example) => ({ params: { id: example.slug }, props: { example } }));

export const GET: APIRoute = ({ props }) =>
  new Response(props.example.svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
