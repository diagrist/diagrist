# 37. The agent skill is published three ways from one folder

Date: 2026-11-05. Status: accepted by the owner (05.11.2026). Amends item 5 of ADR 0036.

## Context

The skill was installed by piping the repository's tarball through `tar` with a path to strip, a command no one
types from memory and no agent finds on its own. Three conventions have settled by now: the `skills` installer
(`npx skills`), which copies a skill to every agent it finds, from a repository or from a site that publishes an
index under `/.well-known/agent-skills/` (Agent Skills Discovery 0.2.0, a draft by Cloudflare); Claude Code
plugins from a marketplace file in a repository; and a zip to upload, as claude.ai takes it.

## Decision

1. **The site publishes a discovery index.** `/.well-known/agent-skills/index.json` names one skill, `diagrist`,
   of type `archive`, with the URL of `diagrist.tar.gz` and its sha256 digest. `npx skills add
   https://diagrist.com` installs from it. The site also serves `diagrist.zip`. Both archives are packed at build
   time from `skills/diagrist` (`apps/website/src/lib/archive.ts`), with the files at the root, sorted, dated
   1980-01-01 and owned by nobody, so the same folder gives the same bytes and digest. The directory sends CORS
   headers, so agents in a browser can read it.
2. **The repository is a Claude Code marketplace.** `.claude-plugin/marketplace.json` lists one plugin,
   `diagrist`, whose source is `./skills/diagrist`; the folder holds `SKILL.md` at its root, so it loads as one
   skill. It names no version, so Claude Code takes the commit as the version and every change on `main` reaches
   users.
3. **Nothing is copied.** All three ways read the one folder: the repository through the installer and the
   marketplace, the site through archives built from it. `tools/docs/test/skill.test.ts` checks that the
   marketplace points at the skill folder under the skill's own name.

## Consequences

A change to the skill reaches marketplace users with the merge and the site's users with the next deploy. The
discovery convention is a draft; if its index changes, only `apps/website/src/lib/skill.ts` follows. The archives
are verified once against `tar`, `unzip` and the `skills` installer when this was built; the website has no test
project, so a change to the packer is checked the same way.
