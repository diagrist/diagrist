# 12. The old extension `.dia` is read for one year

Date: 2026-10-24. Status: accepted. Details ADR 0002 Nr. 6.

## Context

The predecessor wrote `.dia` files, and existing repositories hold dozens of them. `.dgr` is the extension from
now on (ADR 0002). Reading both forever would keep two names in globs, editors, docs and agent instructions;
dropping `.dia` at once would break files that were valid the day before.

## Decision

`dgr` reads `.dia` until **2027-10-24**, one year after ADR 0002, and reports every such file with the warning
`C100`: the extension, the last day and the new name. The call still succeeds. The date lives in one constant in
the CLI. After it, `.dia` is no longer read.

## Consequences

Owners of `.dia` files are told on every call and have a year to rename; there is one extension to document and
teach. Removing the support is one small change on a known date.
