import type { APIRoute } from 'astro';
import { archive, skillZip } from '../../../lib/skill.js';

/** The skill folder as a zip, to upload where an agent takes skills as a file. */
export const GET: APIRoute = () => archive(skillZip, 'application/zip');
