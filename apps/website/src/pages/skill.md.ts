import type { APIRoute } from 'astro';
import { markdown, skillFiles } from '../lib/skill.js';

/**
 * The entry of the agent skill at its old address. Its links point into `/skill/`, where the other files of the
 * folder are; the whole folder is installed as `docs/agents` describes.
 */
export const GET: APIRoute = () =>
  markdown((skillFiles.get('SKILL.md') ?? '').replace(/\]\((?![a-z]+:|\/|#)([^)]+)\)/g, '](/skill/$1)'));
