import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLlmsTxt from 'starlight-llms-txt';
import { dgrGrammar } from './src/lib/dgr-grammar.js';
import { remarkDiagrist } from './src/lib/remark-diagrist.js';
import { repoDocs } from './src/lib/repo-docs.js';

const DESCRIPTION = 'Diagrams as code, checked like code.';

/**
 * diagrist.com: Starlight in its standard theme for the docs, a splash page for the start. The generated pages come
 * from `docs/` (see `repoDocs`); a ` ```dgr picture ` fence is drawn at build time and fails the build when broken.
 */
export default defineConfig({
  site: 'https://diagrist.com',
  markdown: { processor: unified({ remarkPlugins: [remarkDiagrist] }) },
  vite: { server: { fs: { allow: ['../..'] } } },
  integrations: [
    repoDocs(),
    starlight({
      title: 'Diagrist',
      description: DESCRIPTION,
      social: [
        { icon: 'pencil', label: 'Live editor', href: 'https://live.diagrist.com/' },
        { icon: 'github', label: 'GitHub', href: 'https://github.com/diagrist/diagrist' },
      ],
      editLink: { baseUrl: 'https://github.com/diagrist/diagrist/edit/main/apps/website/' },
      customCss: ['./src/styles/diagrams.css'],
      expressiveCode: { shiki: { langs: [dgrGrammar] } },
      sidebar: [
        {
          label: 'Start',
          items: [
            { label: 'Getting started', slug: 'docs/getting-started' },
            { label: 'Live editor and embedding', slug: 'docs/editor' },
            { label: 'For agents', slug: 'docs/agents' },
          ],
        },
        { label: 'Language', items: [{ autogenerate: { directory: 'docs/language' } }] },
        { label: 'Reference', items: [{ label: 'Command line', slug: 'docs/cli' }] },
      ],
      plugins: [starlightLlmsTxt({ projectName: 'Diagrist', description: DESCRIPTION })],
    }),
  ],
});
