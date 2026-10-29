import { grammarOf } from '@diagrist/lang';
import type { APIRoute, GetStaticPaths } from 'astro';
import { plugins } from '../../lib/render.js';

/** The grammar of every kind as data: the `grammar` that `dgr grammar <kind> --json` prints. */
export const getStaticPaths: GetStaticPaths = () =>
  plugins.flatMap((plugin) => plugin.kinds.map((kind) => ({ params: { kind: kind.spec.name }, props: { kind } })));

export const GET: APIRoute = ({ props }) =>
  new Response(`${JSON.stringify(grammarOf(props.kind.spec), null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
