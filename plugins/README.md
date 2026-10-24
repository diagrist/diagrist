# plugins

Every diagram family, look, library, exporter and adapter is a plugin on the same public API as any third-party
plugin would use. Plugins depend on the kernel and its libraries, never on each other.

So far there are `plugin-uml` (UML diagrams, starting with sequence diagrams) and `export-png` (PNG from the
kernel's SVG). Planned are, among others, `plugin-architecture` for C4, `look-sketch`, `export-figjam` and
`export-mermaid`.
