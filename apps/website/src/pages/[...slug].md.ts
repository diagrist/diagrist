import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';

/** Every page as Markdown at its address plus `.md`, for agents; `llms.txt` lists the pages. */
export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection('docs')).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));

export const GET: APIRoute = ({ props }) =>
  new Response(`# ${props.entry.data.title}\n\n${props.entry.body ?? ''}`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
