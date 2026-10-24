# 5. The language is designed for coding agents first

Date: 2026-10-24. Status: accepted.

## Context

Most `.dgr` files will be written and changed by coding agents, then reviewed by people. An agent succeeds when
the language tells it exactly what is allowed, what is not, and what each statement does.

## Decision

- **Explicit over implicit.** No hidden defaults that change the picture; when something is omitted, the docs say
  what happens.
- **Unambiguous.** One keyword, one meaning (ADR 0002); one way to write a thing where possible.
- **Self-describing.** Every kind, statement, argument, attribute and flag has a `doc`, and every statement has at
  least one example. Missing docs or examples fail the tests.
- **Diagnostics that teach.** Each one names what was found, what is allowed (the list), and an example of a
  correct line. A diagnostic should be enough to fix the line without reading the spec.
- **Machine-readable grammar.** The full grammar of every kind is available as data (JSON) for agents and tools,
  derived from the tables (ADR 0004).

Human readability still matters for review, but when the two conflict, the agent wins.

## Consequences

Tables are a bit more verbose to write. In return, spec, skill and error messages are complete by construction.
