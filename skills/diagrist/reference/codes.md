<!-- Generated from the diagnostic catalogues by `pnpm docs:generate`. Do not edit. -->

# Diagnostic codes

The letter of a code names who reports it. Messages show values as `{name}`; in `--json` they are the `values` of the diagnostic. The codes of a kind stand at the end of its reference. These come from the language:

| Code | Message |
|---|---|
| `L001` | Text is missing its closing quote. |
| `L002` | A line starts with a keyword, not with {found}. |
| `L003` | Indent with spaces, not tabs. |
| `L004` | Attribute {key} is set twice; the last value wins. |
| `L005` | The character {found} cannot stand in a diagram: the picture is SVG, and XML has no way to write it. Delete it; tabs, line breaks and every printable character are allowed. |
| `L006` | Statements nest at most {limit} levels deep, and this one would be deeper; it and the lines indented below it are not read. Move it up a level or split the diagram. |
| `L100` | A diagram starts with `diagram {kind} "Title"`. Registered kinds: {allowed}. Example: `{example}` |
| `L101` | Unknown keyword `{found}` here; did you mean `{suggestion}`? Allowed: {allowed}. |
| `L102` | `{statement}` needs {name}: {expected}. Example: `{example}` |
| `L103` | `{found}` is not valid for {name}; expected {expected}. |
| `L104` | `{found}` is not expected in `{statement}`. Allowed after the arguments: {allowed}. Example: `{example}` |
| `L105` | `{statement}` has no attribute `{key}`. Allowed: {allowed}. |
| `L106` | `{statement}` takes no indented lines without a keyword. Allowed child keywords: {allowed}. |
| `L107` | `{found}` is not declared; {name} must be {expected}. Declared: {known}. |
| `L108` | The id `{found}` is already declared in line {first}. Ids are unique within a diagram. |
| `L109` | `use` stands directly after the header, before `{found}` in line {line}. Example: `use "base.dgr"` |
| `L110` | `{file}` is a `{found}` diagram; `use` in a `{kind}` diagram needs a `{kind}` diagram. |
| `L111` | `{file}` uses itself through {chain}. Remove one `use`. |
| `L112` | `drop {found}` matches no line of the picture `{variant}` builds on. Lines with keyword `{keyword}`: {known}. Example: `{example}` |
| `L113` | `drop {found}` matches the lines {lines}. Add arguments until exactly one matches, for example `{example}`. |
| `L114` | `{id}` is dropped in variant `{variant}`, but {name} of this line still refers to it. Drop this line too, or keep `{id}`. |
| `L115` | `set {id}` changes nothing. Write at least one attribute, clause or flag of `{keyword}`: {allowed}. Example: `set {id} {example}` |
| `L116` | `variant {found}` builds on `{from}`, which is declared later in line {line}. Declare `{from}` first. |
| `L117` | `{found}` is already declared in line {first}. In a variant, change it with `set {found} ...` or remove it with `drop {keyword} {found}`. |
| `L118` | `{file}` was not handed over, so it cannot be read. Hosts read every file a diagram needs before they compile it; `dgr` does so and reports C018 when it cannot. |
| `L119` | `{found}` is no allowed path: {case}. A path is relative to the diagram, stays inside the folder `dgr` runs in and names no hidden file or folder. Example: `"../shared/base.dgr"` |
| `L120` | `{file}` would be the {depth}th file in a chain of `use`, and a chain holds at most {max}. Use the file that holds the lines directly, such as `use "../shared/base.dgr"`. |

These come from the kernel:

| Code | Message |
|---|---|
| `G400` | `{first}` overlaps `{second}`. Shorten a text, or change what the layout places here. |
| `G401` | `{key}` reaches outside the picture. |
| `G402` | `{key}` does not fit into `{within}`. Shorten the text or give `{within}` more room. |
| `G403` | `{key}` reaches into the frame `{frame}` without belonging to it, so the picture says it is part of it. Make `{key}` a member of `{frame}`, or split the frame. |
| `K100` | No plugin draws the diagram kind `{found}`. Registered kinds: {allowed}. A diagram starts with `diagram <kind> "Title"`. |
| `K101` | The kind `{kind}` is registered twice, by {plugins}; the first one is used. |
| `K102` | The picture uses the icon `{icon}`, which the style table does not have. Icons: {known}. |
| `K103` | The kind `{kind}` draws no diff pictures; remove `diff` from `variant {variant}`. Kinds with diff pictures: {allowed}. |
| `K104` | A text of the picture reads `{text}`, but its runs read `{runs}`. This is a bug of the plugin, not a mistake in the diagram: the runs of a text join to its text. |
| `K105` | Nothing joins the area `{area}`, so the legend would name a colour the picture does not use. Give elements, frames or lines `area={area}`, or remove the line. |
| `K106` | The picture paints {count} areas in colour, from `{area}` on more than the {limit} a reader can tell apart. Merge areas, or leave some without `tone=` in ink. |
| `K107` | The areas `{first}` and `{area}` share the tone `{tone}`, so the picture cannot tell them apart. Give `{area}` another tone. |
| `K110` | The plugin `{plugin}` failed while drawing the kind `{kind}`: {error}. This is a bug, not a mistake in the diagram; please report it with the diagram at https://github.com/diagrist/diagrist/issues. |
