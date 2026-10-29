import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

/** Starlight's collection: the handwritten pages and the ones `repoDocs` copies from `docs/` before the build. */
export const collections = { docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }) };
