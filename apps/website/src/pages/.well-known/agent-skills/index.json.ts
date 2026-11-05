import type { APIRoute } from 'astro';
import { skillIndex } from '../../../lib/skill.js';

/** The discovery index of the agent skill, which `npx skills add https://diagrist.com` reads. */
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(skillIndex, null, 2)}\n`, { headers: { 'Content-Type': 'application/json' } });
