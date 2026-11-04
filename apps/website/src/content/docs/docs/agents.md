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

## The agent skill

The skill is a folder. `SKILL.md` tells an agent how to work with Diagrist and what to read when. Guides written
by hand say what makes a picture good, which kind answers which question, how to show a core and its extensions
with areas, and what to look at before handing a picture over. A generated reference holds every kind, the
language and the codes, one file each, so an agent reads only the kind it draws. The guides' examples are
checked by the tests, and the reference comes from the same tables as `dgr`.

Read it at [/skill.md](/skill.md). To install the whole folder where your agent looks for skills, for Claude Code
for example:

```sh
mkdir -p .claude/skills
curl -sL https://codeload.github.com/diagrist/diagrist/tar.gz/main \
  | tar -xz -C .claude/skills --strip-components=2 diagrist-main/skills/diagrist
```

## The docs as text

[/llms.txt](/llms.txt) lists the pages of this site for language models,
[/llms-full.txt](/llms-full.txt) holds all of them in one file and [/llms-small.txt](/llms-small.txt) a shorter
version. Every page is also available as Markdown at its address plus `.md`, such as
[/docs/getting-started.md](/docs/getting-started.md).
