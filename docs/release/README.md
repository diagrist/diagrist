# Releasing Diagrist

Nothing is published yet. This page says what is prepared, how a release is cut with Changesets once it is
switched on, and which steps only the owner can take. The workflow that publishes lies next to this page as
`release.yml.proposed` and does nothing until it is copied to `.github/workflows/release.yml`.

## What is published

Eight packages go to npm, all with one version that Changesets keeps in step (`fixed` in `.changeset/config.json`):

| Package | Folder | What it is |
|---|---|---|
| `diagrist` | `packages/cli` | The command line, bins `diagrist` and `dgr`. This is what users install. |
| `@diagrist/lang` | `packages/lang` | Scanner, statement tree, tables and diagnostics of the language. |
| `@diagrist/core` | `packages/core` | The kernel, with the bundled fonts. |
| `@diagrist/parts` | `packages/parts` | Pieces several plugins draw alike. |
| `@diagrist/layout-grid` | `packages/layout-grid` | Grid layout for plugins. |
| `@diagrist/plugin-uml` | `plugins/plugin-uml` | The UML kinds. |
| `@diagrist/plugin-architecture` | `plugins/plugin-architecture` | The C4 kinds, with the bundled icons. |
| `@diagrist/export-png` | `plugins/export-png` | PNG from SVG with resvg. |

`@diagrist/testkit` and `tools/docs` stay private: the testkit serves Diagrist's own tests and has no user outside
the repository yet, and the docs tool is never built. A package is published exactly when its `package.json` has
no `"private": true`; a test in `test/architecture/release.test.ts` then holds it to the same metadata as the others.

Every tarball holds `dist`, the `README` if the package has one, `LICENSE` (which pnpm takes from the repository
root) and a copy of the root `NOTICE`. `@diagrist/core` adds the fonts (JetBrains Mono and Inter) with their licences and `FONTS.md`, and
`@diagrist/plugin-architecture` adds `ICONS.md` with the licences of the icons. Source maps are not built, because
they pointed into `src/`, which is not published. `node test/package/check.ts`, which CI runs after every build,
packs all of them, installs the tarballs into an empty project and builds one example per diagram plugin with the
installed `dgr` against the hashes the plugin tests keep.

The first version is 0.1.0. No start version had been decided, so the packages stay at 0.0.0 in the repository,
and the changeset `.changeset/first-release.md` raises all of them to 0.1.0 with the first release pull request.
Until 1.0, breaking changes are released as `minor` and everything else as `patch`; a `major` changeset would jump
to 1.0.0.

## Licences and NOTICE

Diagrist is Apache-2.0. The root `NOTICE` lists the third-party material the packages ship, each with its licence,
the place of the full licence text and its source. Whoever adds such material, such as another font,
adds an entry to the matching section of the root `NOTICE`, ships the licence text next to the material, and runs
`pnpm docs:generate`, which copies `NOTICE` into every published package. A test fails while a copy is stale.

## How a release is cut

A change that should reach users comes with a changeset: `pnpm changeset` asks which packages changed and how, and
writes a small Markdown file into `.changeset/`. Because all packages are fixed together, any changeset raises all
of them to the same next version.

With the workflow switched on, every push to `main` that carries changesets makes the job `version` open or update
a pull request titled "chore: release". It runs `changeset version`, which deletes the changesets, sets the new
version in every `package.json` and writes the `CHANGELOG.md` of each package. Merging that pull request is the
decision to release. The push that follows has no changesets but a version that npm does not know, so the job
`pack` runs `pnpm check`, builds, runs the tarball check and packs, and the job `publish` waits in the environment
`npm` until the owner approves it. It then uploads the tarballs with provenance, creates the git tags and a GitHub
release per package.

A pull request opened by the workflow's own token starts no other workflow, so CI does not run on the release pull
request by itself. Closing and reopening it starts CI; a GitHub App token passed as `github-token` to the version
step avoids that for good.

## What the owner does once

The steps below need the owner's accounts, and none of them has been done.

1. Create the npm organisation `diagrist` on npmjs.com, which owns the scope `@diagrist`. The unscoped name
   `diagrist` was still free on 24 October 2026 and is claimed by the first publish.
2. In the GitHub repository, allow Actions to create pull requests (Settings, Actions, General, "Allow GitHub
   Actions to create and approve pull requests").
3. Create the environment `npm` (Settings, Environments) with the owner as required reviewer, so no publish runs
   without a click.
4. For the first release, create a granular npm access token that may publish to the `@diagrist` scope and the
   package `diagrist`, with a short expiry, and store it as the environment secret `NPM_TOKEN`. npm lets a trusted
   publisher be configured only for a package that exists, which is why the first upload needs a token.
5. Copy `docs/release/release.yml.proposed` to `.github/workflows/release.yml` and merge it. This needs a push
   token with the workflow scope. The next push to `main` opens the release pull request for 0.1.0.
6. Review the changelogs in that pull request, merge it, and approve the publish job.
7. After the first release, configure a trusted publisher on npmjs.com for each of the eight packages
   (repository `diagrist/diagrist`, workflow `release.yml`, environment `npm`), then delete the secret `NPM_TOKEN`
   and the line `NODE_AUTH_TOKEN` in the workflow. From then on publishing needs no stored secret, and every
   version carries provenance.

Publishing by hand from a laptop is possible with `pnpm changeset publish` after `pnpm build`, but those versions
carry no provenance, so the workflow is the intended way.
