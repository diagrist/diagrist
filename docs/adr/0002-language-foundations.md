# 2. Language foundations

Date: 2026-10-24. Status: accepted.

## Context

The language of the predecessor project (`lang`) is clean in the small (no `any`, errors as data) but describes
every statement two or three times (reader, printer, schema) and knows every diagram kind by name. Plugins need to
add diagram kinds without touching the language.

## Decision

1. **The public contract is the statement tree**: lines with keyword, values, attributes and children. The typed
   model of a diagram kind belongs to its plugin.
2. **Plugins declare statements in tables**; reader, printer, completion, JSON schema and spec are derived from them.
   No hand-written schemas.
3. **One keyword, one meaning** across all kinds. The decision bar gets its own keyword (`adr`), so it also works in
   activity diagrams.
4. **Editor-ready from the start**: comments survive printing, and a file with errors still yields a partial tree.
5. **Messages in English by default**, German via `locale=de`, with proper umlauts.
6. **`.dgr` is the file extension.** `.dia` is still read for one year, with a notice, then removed.
7. **Attributes in kebab-case** as before.

## Consequences

The reader and printer are rewritten around the statement tree; scanner, completion and spec generation are
carried over. Existing `.dia` sources that use `decision` for the decision bar need a one-line change.
