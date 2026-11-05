# 36. The agent skill is a folder: guides by hand, a reference generated

Date: 2026-11-04. Status: accepted by the owner (04.11.2026). Builds on ADR 0004 and 0005; replaces the generated
single `SKILL.md`.

## Context

The skill was one generated file of 631 lines: a short workflow, then the statements of every kind and every code.
An agent drawing one sequence diagram read all twelve kinds, and nothing in it said what makes a picture good. The
owner's goal is pictures to show stakeholders; an agent reaches it only if the skill says what such a picture is,
and that cannot be generated from tables.

## Decision

1. **The skill is a folder with progressive disclosure.** `SKILL.md` is short: the workflow and a table of what to
   read when. Every other file is linked from it directly, one level deep, so an agent opens only what its task
   needs.
2. **What a good picture is, is written by hand.** `pictures.md` (one question per picture, limits, names, lines,
   colour, habits that spoil a picture), `kinds.md` (which kind answers which question, and what makes each good),
   `areas.md` (a core and its extensions) and `review.md` (what to look at before handing a picture over, and what
   to change). `SKILL.md` and its description are handwritten too.
3. **What the tables say stays generated** (ADR 0004): `reference/language.md` with the commands and the statements
   every kind has, `reference/<kind>.md` per kind with its rule codes, `reference/codes.md` with the codes of the
   language and the kernel. `tools/docs` writes them with `pnpm docs:generate`.
4. **Tests keep the handwritten part honest.** `tools/docs/test/skill.test.ts` checks that the description names
   every kind, that the reference folder holds exactly what is generated, that `SKILL.md` links every file, that
   every link resolves, that every `dgr` command, option and code named exists, and that every `dgr` example in a
   guide checks without a single finding.
5. **The site serves the folder** under `/skill/`, and `/skill.md` stays as the entry with its links pointing there.
   It is installed as a folder, as ADR 0037 describes.

## Consequences

A rule about good pictures changes in prose, reviewed like code, and its examples cannot rot. A new kind gets its
reference by itself, but `SKILL.md` and `kinds.md` must name it; the test of the description fails until they do.
The guides can only demand what the check reports; whatever it cannot report is left to the agent looking at the
PNG, so every new check (such as line findings) should be named in `review.md`.
