import type { APIRoute, GetStaticPaths } from 'astro';
import { markdown, skillFiles } from '../../lib/skill.js';

/** Every file of the agent skill under `/skill/`, so the relative links between them work on the site too. */
export const getStaticPaths: GetStaticPaths = () =>
  [...skillFiles].map(([path, text]) => ({ params: { path }, props: { text } }));

export const GET: APIRoute = ({ props }) => markdown(props.text);
