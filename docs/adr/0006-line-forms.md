# 6. Line forms: blocks may define lines without a keyword

Date: 2026-10-24. Status: accepted. Extends ADR 0003.

## Context

Besides UML members (entries, ADR 0003), the predecessor had two more indented lines without a keyword: steps of
a flow (`client -> api "calls"`) and fields of an entity (`id: bigint pk`).

## Decision

At the top level every line starts with a keyword. Inside a block, the statement that opens the block may declare
**one line form** for its indented lines that do not start with one of its child keywords. Declared child keywords
always win over the line form.

## Consequences

Flows, entities and classifiers stay compact, the way Mermaid and D2 write arrows. The rule for agents is short:
top level means keyword first; inside a block, the block's spec lists its line form.
