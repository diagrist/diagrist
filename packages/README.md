# packages

The language, the kernel and the infrastructure around them. Each package has its own `package.json`, and a
package may import another only if it declares it there; `AGENTS.md` lists what each one holds.

| Package | What it is |
|---|---|
| `lang` | Scanner, statement tree, printer, statement tables and diagnostics of the `.dgr` language. |
| `core` | The kernel: plugin registry, `compile`, scene, text metrics, SVG, placement check and the standard look. |
| `parts` | Pieces several plugins draw alike: title header, decision bar, legend. |
| `layout-grid` | Grid layout for plugins: places nodes and frames, routes edges, places labels. |
| `code` | Highlighted source for kinds that show code: lines of text runs with roles, their style table, excerpts by symbol, region or lines. |
| `testkit` | Golden files and a strict JSON Schema check, for tests only. |
| `cli` | The command line `dgr`. |

Further layout libraries (`layout-*`), a language server (`lsp`), an MCP server (`mcp`) and the meta package
`diagrist` are planned and will live here too.
