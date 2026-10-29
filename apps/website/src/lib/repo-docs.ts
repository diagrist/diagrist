import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

/** Files of the repository that are not pages of the site are linked on GitHub. */
const GITHUB = 'https://github.com/diagrist/diagrist/blob/main/';

/** Where the copies go inside the site, relative to its root; ignored by git, written before every build. */
const CONTENT = 'src/content/docs/';

/** A page the site takes from the repository: its path there, its path in the content folder and its order. */
interface RepoPage {
  readonly from: string;
  readonly to: string;
  readonly order: number;
  readonly label?: string;
}

/**
 * The pages `tools/docs` generates (ADR 0004): the language overview, one page per kind in the order the overview
 * lists them, and the command line reference. The site never keeps its own copy of what the tables say.
 */
function repoPages(repo: string): RepoPage[] {
  const overview = readFileSync(join(repo, 'docs/language/README.md'), 'utf8');
  const listed = [...overview.matchAll(/\]\(([a-z-]+)\.md\)/g)].map((m) => m[1] ?? '');
  const kinds = readdirSync(join(repo, 'docs/language'))
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => file.slice(0, -3))
    .sort((a, b) => rank(listed, a) - rank(listed, b));
  return [
    { from: 'docs/language/README.md', to: 'docs/language/index.md', order: 0, label: 'Overview' },
    ...kinds.map((kind, i) => ({ from: `docs/language/${kind}.md`, to: `docs/language/${kind}.md`, order: i + 1 })),
    { from: 'docs/cli.md', to: 'docs/cli.md', order: 0 },
  ];
}

const rank = (listed: readonly string[], kind: string): number =>
  listed.includes(kind) ? listed.indexOf(kind) : listed.length;

/** The URL of a page in the content folder: `docs/language/index.md` is `/docs/language/`. */
const urlOf = (to: string): string => `/${to.replace(/(index)?\.md$/, '')}`.replace(/([^/])$/, '$1/');

/**
 * One page as Starlight reads it: the heading becomes the title, the first paragraph the description, and every
 * relative link points to the page of the site or, for other files, to GitHub.
 */
function pageOf(page: RepoPage, text: string, pages: readonly RepoPage[]): string {
  const heading = /^# (.+)$/m.exec(text);
  const title = (heading?.[1] ?? page.from).replaceAll('`', '');
  const body = heading === null ? text : text.replace(heading[0], '');
  const paragraph = body.split(/\n\n/).find((p) => p.trim() !== '' && !/^\s*(<!--|#|\||```)/.test(p)) ?? '';
  const description = paragraph
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replaceAll('`', '')
    .replace(/\s+/g, ' ')
    .trim();
  const linked = body.replace(/\]\((?!https?:|#|\/)([^)#\s]+)(#[^)\s]*)?\)/g, (_, target: string, hash = '') => {
    const path = posix.normalize(posix.join(posix.dirname(page.from), target));
    const known = pages.find((p) => p.from === path);
    return `](${known === undefined ? GITHUB + path : urlOf(known.to)}${hash})`;
  });
  const sidebar = { order: page.order, ...(page.label === undefined ? {} : { label: page.label }) };
  return [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    'editUrl: false',
    `sidebar: ${JSON.stringify(sidebar)}`,
    '---',
    linked.trimStart(),
  ].join('\n');
}

/** An Astro integration that copies the generated pages of the repository into the site before it builds. */
export function repoDocs(): AstroIntegration {
  return {
    name: 'diagrist-repo-docs',
    hooks: {
      'astro:config:setup': ({ config, logger }) => {
        const site = fileURLToPath(config.root);
        const repo = join(site, '../..');
        const pages = repoPages(repo);
        rmSync(join(site, CONTENT, 'docs/language'), { recursive: true, force: true });
        for (const page of pages) {
          const target = join(site, CONTENT, page.to);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, pageOf(page, readFileSync(join(repo, page.from), 'utf8'), pages));
        }
        logger.info(`copied ${pages.length} generated pages from docs/`);
      },
    },
  };
}
