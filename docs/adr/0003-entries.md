# 3. Entries: indented lines that start with a text

Date: 2026-10-24. Status: accepted.

## Context

UML classifiers list their members as plain text lines, as PlantUML and Mermaid do:
`"- number : Integer"` under `class ticket`. In the predecessor project 157 of these lines were a special case
of the class grammar. ADR 0002 says every statement starts with a keyword.

## Decision

An indented line that starts with a text is an **entry** of the statement above it. Entries have arguments and
attributes like statements (`"+ total() : Money" abstract`) but no keyword and no children. They live in their
own list, `Statement.entries`, next to `Statement.children`. A text line at the top level stays an error (L002).

## Consequences

Members stay compact to write and read, and all existing class, interface and enum sources remain valid.
The plugin that owns the statement decides what its entries mean.
