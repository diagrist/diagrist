# 4. Single source of truth: derive, do not repeat

Date: 2026-10-24. Status: accepted.

## Context

The predecessor described every statement two or three times (reader, printer, schema) and kept spec, skill and
completion by hand. Each copy drifted.

## Decision

Every fact has exactly one source. Everything else is **derived** from it and never edited by hand. For each new
piece we ask: is this a source or a derivative? If it can be derived, it must be.

| Source | Derived from it |
|---|---|
| Statement tables of a kind | reading and validation, value types (`Infer`), completion, JSON schema, language spec, agent skill, error messages listing what is allowed |
| Examples in the tables | tests that every example reads without diagnostics, examples in spec and skill |
| Diagnostic catalogue | message texts in every locale, the list of codes in the docs |
| `package.json` exports | build entries, public API docs |

Derived artifacts that are checked in carry a header naming their source, and CI fails when regenerating them
changes anything.

## Consequences

Adding a statement, attribute or rule is one change in one place. A derivative that cannot be generated yet is
listed as debt, not written by hand.
