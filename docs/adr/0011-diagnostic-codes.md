# 11. Diagnostic codes: one prefix per package, warnings plus 500, one place each

Date: 2026-10-24. Status: accepted. Extends ADR 0008 Nr. 2.

## Context

Tools and agents match on codes, so a code must stay stable. The predecessor numbered errors and warnings
separately (`E400` and `W400` were different checks), and a code stood in the model, the rule, the message
catalogue and the README, which drifted.

## Decision

1. **The prefix names who reports:** `L` the language, `K` and `G` (placement) the kernel, `C` the CLI (`C0xx`
   refusals, `C1xx` findings about a file), and one letter per plugin, `U` for `plugin-uml`.
2. **Predecessor codes keep their number.** Errors keep it as is (`E403` becomes `U403`). Warnings shared their
   numbers with errors, so under one prefix they keep theirs **plus 500** (`W401` becomes `U901`). The old code can
   be derived from code and severity; severity stays a field, not a letter.
3. **A code is written in its rule and in its catalogue, nowhere else.** Models name cases, not codes; tables of
   codes in docs are generated from the rules, and a test fails when they are out of date.
4. **Codes are never reused.** A retired code stays retired, such as `C010`.

## Consequences

Searching for a code finds its rule and its texts. Mapping old sources to new codes needs no lookup table, and a
new check is one rule plus one catalogue entry.
