---
title: For agents
description: How a coding agent works with Diagrist - the grammar and findings as JSON, the agent skill, llms.txt and every page as Markdown.
---

Diagrist is written for coding agents as much as for people ([ADR 0005](https://github.com/diagrist/diagrist/blob/main/docs/adr/0005-agent-first-language.md)). Every statement, argument, attribute and
flag has a description and an example, and the pages, the JSON and the skill are generated from the same tables
that check the diagrams, so they cannot drift from what Diagrist accepts.

## The loop

An agent works the way a person does, only faster: look the grammar up, write the file, check it until nothing is
reported, format it and build it.

```sh
dgr grammar sequence --json     # every statement of the kind as data
dgr check order.dgr --json      # every finding as data
dgr fmt order.dgr
dgr build order.dgr --png       # look at the picture
```

`dgr grammar <kind> --json` prints each statement with its arguments, clauses, attributes, flags, doc and
examples. The same data is on this site as `/grammar/<kind>.json`, such as
[/grammar/sequence.json](/grammar/sequence.json), and it validates against the
[JSON Schema](https://github.com/diagrist/diagrist/blob/main/schemas/grammar.schema.json).

`dgr check <file> --json` reports each finding with its code, position and the values its message is built from,
so a tool does not have to parse text:

```json
{
  "diagrist-cli": 1,
  "command": "check",
  "ok": false,
  "file": "order.dgr",
  "diagnostics": [
    {
      "file": "order.dgr",
      "code": "L105",
      "severity": "error",
      "span": { "line": 4, "column": 29, "length": 20 },
      "values": { "statement": "participant", "key": "stereotyp", "allowed": "`stereotype=`, `tone=`" },
      "message": "`participant` has no attribute `stereotyp`. Allowed: `stereotype=`, `tone=`."
    }
  ]
}
```

## Into FigJam

`dgr export figjam` brings pictures onto a FigJam board through Figma's agent tools. It writes each picture as an
SVG rewritten for Figma's import, `order.figjam.svg`, and a `board.js`. The agent uploads the SVGs with
`upload_assets`, posting each as multipart so its file name names the layer, and runs `board.js` with `use_figma`,
which lays every picture into a section of its own and replaces those of an earlier export in place.

```sh
dgr export figjam order.dgr --json     # order.figjam.svg, one per variant, and board.js
```

## The agent skill

The skill is a folder. `SKILL.md` tells an agent how to work with Diagrist and what to read when. Guides written
by hand say what makes a picture good, which kind answers which question, how to show a core and its extensions
with areas, and what to look at before handing a picture over. A generated reference holds every kind, the
language and the codes, one file each, so an agent reads only the kind it draws. The guides' examples are
checked by the tests, and the reference comes from the same tables as `dgr`.

Read it at [/skill.md](/skill.md). Install the whole folder in one of three ways; each installs the same files.

**Any agent, from this site.** The site publishes the skill by the
[Agent Skills discovery](https://github.com/cloudflare/agent-skills-discovery-rfc) convention, an index at
[/.well-known/agent-skills/index.json](/.well-known/agent-skills/index.json) that names the folder as an archive
with its digest. The `skills` installer reads it and copies the skill to Claude Code, Codex, Cursor and the other
agents it finds:

```sh
npx skills add https://diagrist.com
```

`npx skills add diagrist/diagrist` installs the same folder from the repository.

**Claude Code, as a plugin.** The repository is a plugin marketplace, so Claude Code installs the skill and keeps it
current with every change on `main`:

```sh
/plugin install diagrist --marketplace diagrist/diagrist
```

On versions before 2.1.275, add the marketplace first with `/plugin marketplace add diagrist/diagrist`, then run
`/plugin install diagrist@diagrist`.

**As a file.** [diagrist.zip](/.well-known/agent-skills/diagrist.zip) holds the folder with `SKILL.md` at its root,
for an agent that takes skills as an upload, such as claude.ai under Settings, Capabilities. The same folder as
[diagrist.tar.gz](/.well-known/agent-skills/diagrist.tar.gz) unpacks into a skills directory:

```sh
mkdir -p .claude/skills/diagrist
curl -sL https://diagrist.com/.well-known/agent-skills/diagrist.tar.gz | tar -xz -C .claude/skills/diagrist
```

## The docs as text

[/llms.txt](/llms.txt) lists the pages of this site for language models,
[/llms-full.txt](/llms-full.txt) holds all of them in one file and [/llms-small.txt](/llms-small.txt) a shorter
version. Every page is also available as Markdown at its address plus `.md`, such as
[/docs/getting-started.md](/docs/getting-started.md).
