# 32. The website diagrist.com in the monorepo, built from the generated docs

Date: 2026-10-29. Status: accepted, decided by Noel. Builds on ADR 0004, 0005 and 0009.

## Context

Diagrist needs a website with a start page and the docs. Most of the docs exist already: `tools/docs` generates the
language overview, one page per kind and the command line reference from the tables, and checks them into `docs/`.
A site that keeps its own copy of these pages, or its own generator, would drift from what Diagrist accepts. The
packages are not published yet, so a site in another repository could not build against them.

A spike on 2026-10-24 compared Astro with Starlight, VitePress, Docusaurus, Fumadocs, Nextra and Mintlify.
Starlight builds on Vite like the editor, has search and i18n built in, keeps the docs in a standard theme and lets
a remark plugin draw diagrams at build time. VitePress 2 was still alpha, Nextra without releases, Docusaurus not on
Vite, and Mintlify cannot run our pipeline.

## Decision

The website is `apps/website`, an Astro site with Starlight in its standard theme, built statically and served by
Vercel at diagrist.com. Like the editor it is a host (ADR 0009): it reaches the kernel through `compile`,
`formatMessage` and `grammarOf` only, and its own CSS is limited to the fonts the kernel measures with and the frame
of a picture.

The site does not generate docs. Before every build it copies the pages `tools/docs` checked in (`docs/language`,
`docs/cli.md`) into its content, takes the title and description from them and points relative links to the pages of
the site or to GitHub. The copies are ignored by git. Handwritten pages are only what the tables cannot say: the start
page, getting started, the editor and the page for agents.

A ` ```dgr picture ` fence is drawn when the site builds, shown above its source with a link that opens it in the live
editor. A fence with any finding, also a warning, stops the build, so the site cannot show a broken example. Other
`dgr` fences, such as the statement examples of the generated pages, stay code with highlighting.

For agents (ADR 0005) the site serves every page as Markdown at its address plus `.md`, `llms.txt` and its full and
short variants, the grammar of every kind as `/grammar/<kind>.json` and the skill as `/skill.md`.

## Consequences

The site builds from `dist` of the packages, so its build runs `pnpm build` first. A change to a table changes the
site in the same pull request. The site is English; German can follow with Starlight's i18n. The gallery at `/gallery/` draws
every example under `plugins/*/examples` at build time, filters them by kind and opens each in a window with its
source and a link to the live editor, the way D2's example gallery does; the editor is not framed, so it keeps
`frame-ancestors 'none'`. Examples that read other files get no editor link, since the editor has no files. The start page keeps examples of its own in `apps/website/src/examples`. Versioned
docs wait for 1.0.
