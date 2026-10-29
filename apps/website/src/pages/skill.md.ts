import type { APIRoute } from 'astro';
import skill from '../../../../skills/diagrist/SKILL.md?raw';

/** The agent skill as `tools/docs` generates it, to download into an agent's skills folder. */
export const GET: APIRoute = () => new Response(skill, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
