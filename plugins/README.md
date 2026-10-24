# plugins

Every diagram family, look, library, exporter and adapter is a plugin on the same public API as any third-party
plugin would use. Plugins depend on the kernel and its libraries, never on each other.

So far there are `plugin-uml` (UML sequence, use case, activity, class and state machine diagrams),
`plugin-architecture` (C4 context, container and component diagrams) and `export-png` (PNG from the kernel's SVG).
Planned are, among others, `look-sketch`, `export-figjam` and `export-mermaid`.

The two diagram plugins are built alike: statement tables in `grammar`, checks in `rules` with their texts in
`messages`, then `layout`, `scene` and `describe`, with the words of picture and description in `texts`. They differ
on purpose in three ways. A UML kind has a folder of its own, while the three C4 levels share one set of tables. The
UML examples are sorted by kind and the C4 examples by the system they show, since one system appears at several
levels. Only the UML kinds have a catalog of the specification they cover (ADR 0017), because C4 has no numbered
specification to cite.
