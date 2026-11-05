import type { APIRoute } from 'astro';
import { archive, skillTarGz } from '../../../lib/skill.js';

/** The skill folder as the archive the discovery index names. */
export const GET: APIRoute = () => archive(skillTarGz, 'application/gzip');
