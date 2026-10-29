# Concept: pictures of a business concept, a kind with declared vocabulary and a matrix

Date: 2026-10-29. Status: draft for the owner's review. It proposes ADR 0030 (`concept`) and ADR 0031 (`matrix`) and
builds on `docs/scope.md` (ADR 0027, proposed) and on responsibilities on C4 elements (ADR 0028, proposed). Every
syntax below is a draft: it shows what a file says and what Diagrist checks, not final keywords.

## Why

A business concept (in German, a Fachkonzept) is written before the architecture. It says what belongs to the
subject and what does not, which terms the business uses, who is responsible for what, what is required, and by
which rules a case is decided. The architect reads it, and later writes the architecture against it.

Half of its pictures exist in Diagrist already. The other half has no home, because each of them is either a graph
of things of a business's own types, or a table of two sets.

| Question of the concept | Picture | Today | Proposed home |
|---|---|---|---|
| What belongs to the subject, what does not? | System context with users and neighbours | `context` | as is |
| Who wants what from the system? | Use cases | `usecase` | as is |
| How does the work run? | Process with lanes | `activity` with `partition` | as is |
| What is the lifecycle of a business object? | States of an order, a claim, a contract | `state` | as is |
| Which business objects exist and how do they relate? | Domain model without methods | `class` | as is |
| Which terms do we use, and what do they mean? | Term model with definitions, synonyms marked | missing | `concept`, vocabulary `terms` |
| Which business areas are there and how do they depend on each other? | Context map (DDD) | missing (`domain` in the scope, later) | `concept`, vocabulary `context-map` |
| What can the business do, and where does it need to invest? | Capability map, two levels of frames, a rating | missing | `concept`, vocabulary `capability` |
| Who reports to whom, who stands in for whom? | Role model | missing | `concept`, vocabulary `roles` |
| Who does, approves, is asked, is told? | RACI matrix of tasks and roles | missing (ADR 0028 draws it on systems) | `matrix`, scale `raci` |
| Which use case creates, reads, changes, deletes which object? | CRUD matrix | missing | `matrix`, scale `crud` |
| Which requirement is met by which building block? | Traceability matrix | missing | `matrix`, scale `cover` |
| Which role may do what? | Permission matrix | missing | `matrix`, scale `check` |
| Our own pictures: tasks and the documents they create, risks and their controls | Graph of declared types | missing | `concept` with a vocabulary of the file |

## The scope's rule, and why a generic kind passes it

ADR 0027 closes the catalogue by a rule: a kind enters when it has rules Diagrist can fail and a layout family that
needs no hand placement. A generic box-and-arrow kind fails that rule, and the scope refuses it for good reason: it
is the drawing tool Diagrist does not want to be.

`concept` is not generic in that sense. Its file declares a vocabulary first, the types of things and the types of
relations between them, and every declaration is a rule: an item of an undeclared type, a relation between types
the declaration does not allow, a type that must have a relation and has none, a chain that must not loop and
does. The declaration is also the legend, so the picture says what each shape and line means wherever it is shown
(lesson 9 of the scope). What remains closed is everything the scope closes: shapes come from a table, colour is a
tone with a legend entry, position is a named cell or an order, and the constraints a declaration can state are a
closed set, not an expression language.

The vocabularies that recur come with the plugin: context map, capability map, terms and roles. They are
declarations written once, tested once, and documented like any table (ADR 0004). This answers the scope's other
worry, the race for kinds, from the other side: four pictures that would be four kinds with four grammars become one
kind and four vocabularies.

`matrix` passes the rule directly. It has two declared sets and a scale, and a scale carries rules that a table
in a word processor never checks: exactly one accountable per task, every object created somewhere, every
requirement covered, every cell of a rating filled.

## Kind `concept`

### What a file says

A file declares types with `type` and relations with `link`, then writes items with `item` and relations with
`rel`. An item names its type with the clause `is`, as C4 names its cell with `at` and its frame with `in`. A
relation names its link where other kinds write an arrow, so it reads as a sentence.

```dgr
diagram concept "Ausleihe: wer erzeugt welchen Beleg" locale=de
type rolle "Rolle" shape=person
type aufgabe "Aufgabe" shape=round
type beleg "Beleg" shape=doc
link fuehrt "führt aus" from=rolle to=aufgabe each=to
link erzeugt "erzeugt" from=aufgabe to=beleg each=to single=to

item kunde "Kunde" is rolle
item station "Stationsteam" is rolle
item ausleihen "Rad ausleihen" is aufgabe
item zurueck "Rad zurückgeben" is aufgabe
item pruefen "Schaden prüfen" is aufgabe
item vertrag "Mietvertrag" is beleg
item protokoll "Schadensprotokoll" is beleg

rel kunde fuehrt ausleihen
rel kunde fuehrt zurueck
rel station fuehrt pruefen
rel ausleihen erzeugt vertrag
rel pruefen erzeugt protokoll
```

Without a `grid` the items are layered along the direction of their links, as `class` and `activity` are. With
`grid cols` and `grid rows` the items take `at <col>/<row>` like C4, so a picture can stand in fixed columns and two
variants of it can be compared cell by cell (ADR 0021). Items take `in <ref>` to stand in an item of a frame type,
and indented texts below an item are its entries (ADR 0003), drawn below its name.

### Statements

| Statement | Form | Meaning |
|---|---|---|
| `type` | `type <id> <label> [shape=<box\|round\|person\|store\|doc\|frame>] [tone=<choice>] [explain]` | A type of thing. `frame` makes its items frames that other items stand `in`. `explain` asks every item of the type for at least one entry. |
| `link` | `link <id> <label> from=<types> to=<types> [line=<solid\|dashed\|dotted>] [head=<arrow\|open\|triangle\|diamond\|none>] [each=<from\|to\|both>] [single=<from\|to\|both>] [acyclic] [starts=<words>] [ends=<words>]` | A type of relation between the listed types. |
| `item` | `item <id> <label> is <type> [at <place>] [in <ref>] [rate=<value>] [status=<planned\|deprecated>]` | One thing of a declared type. |
| `rel` | `rel <from> <link> <to> [label] [start=<words>] [end=<words>]` | One relation of a declared link. |
| `grid`, `note`, `use`, `variant`, `set`, `drop` | as in the C4 kinds and in every kind | |
| `scale` | `scale <id> <label>` with `value` lines, shared with `matrix` | An ordered set of ratings for `rate=` on items, painted by rank. |

`each=to` reads "every item of a `to` type has at least one such relation", `single=to` "at most one"; both
together mean exactly one. `starts=` and `ends=` list the badge words a relation of this link may carry at its two
ends, and a `rel` picks from them with `start=` and `end=`.

### Rules

Rules from the declaration are errors, because the author stated them. Rules of hygiene are warnings.

| Finding | Severity |
|---|---|
| An item of an undeclared type, a relation of an undeclared link | error (`L107` from `lang`) |
| A relation between types the link does not list in `from=` and `to=` | error |
| `each=` or `single=` broken: the finding names the item and the link | error |
| A cycle through an `acyclic` link: the finding names the items of the cycle | error |
| A badge that the link does not list in `starts=` or `ends=` | error |
| An item of an `explain` type without an entry | error |
| A declared type or link that no item or relation uses (the legend would name what the picture does not show) | warning |
| More than six types, or more than four tones (scope, lesson 4) | warning |
| Frames nested deeper than two (scope, lesson 10) | warning |
| More than about forty items without a frame (scope, lesson 11) | warning |
| An item without any relation, in a vocabulary that declares links | warning |

### What Diagrist draws and decides

The legend is generated from the declaration and only lists what the picture uses: one sample shape per type with
its label, one sample line per link with its label and head. The description writes one sentence per relation from
the link's label ("Stationsteam führt aus: Schaden prüfen") and one per broken expectation that is only a warning.
The shape table, the line forms and the heads are those of the standard look, and every distinction between two
types is carried by shape or line, never by colour alone, so it survives greyscale.

### Vocabularies

`vocabulary=<name>` on the header loads a vocabulary of the plugin. The file may add types and links of its own; it
may not redeclare those of the vocabulary. A vocabulary is a table of declarations, documented and tested like
every table, and may bring a few rules in code where declarations do not reach.

| Vocabulary | Types | Links and their rules | Layout | Rules beyond declarations |
|---|---|---|---|---|
| `context-map` | `context`, `external` (dashed box) | `upstream` (from upstream to downstream; badges U and D always, `starts=OHS,PL`, `ends=ACL,CF,CS`), `partnership`, `shared-kernel` (both drawn without head, badge on the line) | grid or layered | `ACL` only downstream, `OHS` only upstream, are already in `starts=` and `ends=`; a `shared-kernel` between more than two contexts is a warning |
| `capability` | `area` (frame, level 1), `capability` (box, level 2); level 3 as entries | none | tiles in rows of frames, no edges | a capability outside an area; names unique within an area |
| `terms` | `term` with `explain` | `is-a` (triangle head, `acyclic`), `part-of` (diamond, `acyclic`), `relates` (label from `rel`), `same-as` (dashed) | layered | a `same-as` pair is a warning that asks to pick one term and mark the other `status=deprecated` |
| `roles` | `unit` (frame), `role` (person) | `reports-to` (`single=from`, `acyclic`), `deputy` (`each=from` when the vocabulary option `deputies` is set) | layered top down | a role that is its own deputy |

Two of them, for illustration:

```dgr
diagram concept "Radverleih: Kontexte" vocabulary=context-map locale=de
item ausleihe "Ausleihe" is context
item flotte "Flotte" is context
item konto "Kundenkonto" is context
item abrechnung "Abrechnung" is context
item zahlung "Zahlungsanbieter" is external

rel flotte upstream ausleihe start=OHS,PL end=ACL
rel konto upstream ausleihe
rel ausleihe upstream abrechnung end=CF
rel zahlung upstream abrechnung end=ACL
rel flotte partnership abrechnung
```

```dgr
diagram concept "Radverleih: Fähigkeiten" vocabulary=capability locale=de
item kunden "Kunden gewinnen" is area
item betrieb "Ausleihe betreiben" is area
item flotte "Flotte managen" is area
item finanzen "Finanzen" is area

item registrierung "Registrierung" is capability in kunden rate=reif
item tarife "Tarife" is capability in kunden rate=reif
item reservierung "Reservierung" is capability in betrieb rate=teils
item entsperren "Entsperren" is capability in betrieb rate=reif
  "per App"
  "per Terminal"
item wartung "Wartung" is capability in flotte rate=fehlt
item ortung "Ortung" is capability in flotte rate=teils
item abrechnung "Abrechnung" is capability in finanzen rate=reif
item mahnwesen "Mahnwesen" is capability in finanzen rate=fehlt
```

The vocabulary `capability` brings its scale (`fehlt`, `teils`, `reif`), painted by rank in fill and with a sign,
and listed in the legend.

### From a file's vocabulary to a kind

A vocabulary written in a file is the start. When the same declarations appear in several files, they move into a
file of their own that others `use`, which needs `use` to bring declarations across files (ADR 0021 brings a base of
the same kind, so this is close). When a vocabulary is useful beyond one team, it becomes a vocabulary of the plugin.
It becomes a kind of its own only when it needs a layout family or rules that declarations and a few rules in code
cannot carry, which the scope expects for `domain` with message flows on its edges.

## Kind `matrix`

### What a file says

A matrix has columns, rows and a scale. Columns are declared with `col`, rows with `row`, and below each row stand
its cells as a line form (ADR 0006): the id of a column and one or more values of the scale.

```dgr
diagram matrix "Ausleihe: Zuständigkeiten" scale=raci locale=de
col kunde "Kunde"
col station "Stationsteam"
col support "Kundenservice"
col finanzen "Buchhaltung"

group vorgang "Vorgang"
row ausleihen "Rad ausleihen" in vorgang
  kunde R
  station A
row zurueck "Rad zurückgeben" in vorgang
  kunde R
  station A
  support I
group nachlauf "Nachlauf"
row schaden "Schaden regulieren" in nachlauf
  station R,A
  support C
  finanzen I
row mahnung "Mahnung senden" in nachlauf
  finanzen R
  support I
```

The last row has no accountable, so the picture is not drawn and the finding says: "Mahnung senden" has no `A`;
the scale `raci` asks for exactly one per row.

### Statements

| Statement | Form | Meaning |
|---|---|---|
| header | `diagram matrix "<title>" scale=<raci\|crud\|cover\|check\|rating\|ref> [cover=<rows\|cols\|both>] [heads=<flat\|slanted>]` | The scale of every cell, and whether every row or column needs at least one value. |
| `col` | `col <id> <label> [in <ref>]` | A column, left to right in the order written. |
| `row` | `row <id> <label> [in <ref>]` | A row, top to bottom; its indented lines are its cells. |
| cell (line form) | `<col> <values>` | The values of one cell, from the scale; several separated by commas where the scale allows it. |
| `group` | `group <id> <label>` | A band over rows or a head over columns; a group holds rows or columns, never both. |
| `scale` | `scale <id> <label> [single] [full]` with `value` lines | A scale of the file. `single` allows one value per cell, `full` asks for a value in every cell. |
| `value` | `value <id> <label> [mark=<letter\|full\|half\|empty\|check\|cross\|dash>] [row=<one\|some\|most-one>] [col=<one\|some\|most-one>]` | One value of a scale, how it is drawn, and how often it must appear per row and per column. |
| `note`, `use`, `variant`, `set`, `drop` | as in every kind | |

### Scales of the plugin

| Scale | Values | Rules | Typical picture |
|---|---|---|---|
| `raci` | R responsible, A accountable, C consulted, I informed; several per cell | per row exactly one A and at least one R | tasks against roles |
| `crud` | C, R, U, D; several per cell | per column at least one C and at least one R: every object is created and read somewhere | use cases against business objects |
| `cover` | full, part; one per cell | `cover=both` by default: every row and every column has a mark | requirements against building blocks |
| `check` | allowed, denied, n/a; one per cell, `full` | every cell filled | permissions of roles |
| `rating` | ++, +, o, -, --; one per cell, `full`, ordered | every cell filled | options against criteria, without a chosen one |

`rating` is deliberately not a decision. A picture that marks one option as chosen and gives the reason is the
planned kind `decision` (ADR 0027), which will draw its matrix form with the same layout library. A matrix with
`scale=rating` and a note "we take B" is the case `decision` exists for, and the description says so.

### Rules

| Finding | Severity |
|---|---|
| A cell names an undeclared column, a row an undeclared group | error (`L107`) |
| A value not in the scale; several values where the scale is `single` | error |
| The same column twice in one row | error |
| `row=` or `col=` of a value broken: the finding names the row or column and the value | error |
| An empty cell in a `full` scale; a row or column without value under `cover=` | error |
| A group holding rows and columns | error |
| More than twelve columns or forty rows, or a picture wider than 1,100 pixels | warning that suggests groups or a split |
| A declared value that no cell uses | warning, since the legend would list it |

### What Diagrist draws and decides

Column heads stand above the matrix, wrapped to the width of a cell, or slanted at 45 degrees with `heads=slanted`
when the labels are long and the columns many. Row heads stand left, wrapped to a column width the engine measures.
Groups of rows are bands with their label in a row of their own, groups of columns a second head line. Cells are
equal. A `letter` value is set as its id in the mono face, every other mark is drawn as a shape, so ratings and
coverage survive greyscale and every typeface. The legend is generated from the scale and lists the values with
their labels and rules ("exactly one A per row"). The description writes one sentence per row: "Rad zurückgeben:
responsible Kunde, accountable Stationsteam, informed Kundenservice."

### Rows and columns from other files

The strongest matrix is one whose sets are not typed twice. A traceability matrix whose rows are the requirements of
a `requirements` file and whose columns are the containers of a C4 file cannot drift from them. This needs `use`
across kinds, which the scope already asks for (lesson 6), and is the second step, not the first. The same holds for
RACI and ADR 0028: if `does` gains `raci=`, a matrix of a C4 file's responsibilities can be derived instead of
written. Both stay open until the first matrix stands.

## Where the code goes

Both kinds go into one new plugin, `plugins/plugin-concept`, with one entry per kind as in ADR 0024
(`@diagrist/plugin-concept/concept`, `/matrix`). They share the `scale` and `value` tables in `src/shared`; no file
of one kind reaches the other's folder.

| Piece | Where | State |
|---|---|---|
| Layered graph | `layerGraph` in `layout-grid` | exists |
| Named cells, frames, routes, labels | `layout-grid` | exists |
| Badges at both ends of a line | in `plugin-uml` for use cases | moves into `layout-grid` with the context map as second user, which settles the burn-down entry on labels along straight lines |
| Tiles in rows of frames without edges | missing | added to `layout-grid`; `landscape` in the scope needs the same |
| Matrix with heads, bands and equal cells | missing | new library `packages/layout-matrix`, the "matrix and cards" family of the scope, knowing no kind; `decision` and `requirements` reuse it |
| Legend from declarations and scales | legend mechanics in `parts` | exists; the samples come from the kinds |

The keywords `type`, `item`, `row`, `col`, `value` and `scale` are plain English words that the neutral packages use
too, so the architecture test of kind words lists them as general words, as it does for `node` and `group`.

## Order of work

Each step is one pull request under about 3,000 lines and green on its own.

| Step | What | Why in this place |
|---|---|---|
| 1 | This concept, ADR 0030 and 0031 as proposals, the scope's catalogue amended | the owner decides before code exists |
| 2 | `packages/layout-matrix`, kind `matrix` with `raci`, `crud` and `cover`, look `plain`, examples of the bike rental | the smallest kind with the clearest rules, responsibilities of roles that are not systems, and the layout `decision` and `requirements` wait for |
| 3 | `matrix`: scales of the file, `check` and `rating`, groups of columns, slanted heads | fills the matrix out once its layout stands |
| 4 | kind `concept`: `type`, `link`, `item`, `rel`, layered and grid placement, legend from declarations, the declared rules, vocabularies `terms` and `roles` | the generic core, with the two vocabularies that need nothing new from the layout |
| 5 | vocabulary `context-map`, badges at line ends moved into `layout-grid` | needs the badges |
| 6 | vocabulary `capability`, tiles in frames in `layout-grid` | needs the tiles |

Later, when a real diagram asks for it: a vocabulary for domain stories (numbered sentences of actor, activity and
work object, a `flow` over items), vocabularies shared across files with `use`, and rows and columns from other
files.

## Open questions for the owner

| # | Question | Proposal |
|---|---|---|
| 1 | Names: `concept` and `matrix`, plugin `plugin-concept`? | yes; `concept` says what the picture is for, and neither name collides with a word of the kernel |
| 2 | Does `domain` of the scope become the vocabulary `context-map` of `concept`? | yes, until message flows on its edges need a kind |
| 3 | RACI: may one cell hold R and A together, and is RASCI (S for support) needed? | R,A allowed; RASCI as a second scale only if a real matrix asks for it |
| 4 | Scales and constraints of the file in the first matrix, or only the scales of the plugin? | scales of the plugin first (step 2), the file's own in step 3 |
| 5 | Should `does` of ADR 0028 gain `raci=`, so a matrix can be derived from a C4 file? | later, after step 3, once both exist |
| 6 | Cells as a line form `station R,A`, or as a statement `cell station R,A`? | the line form; a row reads like a list of who does what |

## Deviations

Step 2 is built. Where the code asked for something else than the draft above, this section says what and why.

| Draft | Built | Why |
|---|---|---|
| One entry per kind, `@diagrist/plugin-concept/matrix` | one entry, the root | ADR 0024 cuts entries per kind to keep a host from loading kinds it does not draw; with one kind the subpath would repeat the root. It comes with `concept`. |
| A warning for a declared value that no cell uses | no warning for the scales of the plugin; the legend lists the values in use and those with a rule | a RACI matrix without C or I is normal, so the warning would fire on most matrices. It belongs to the scales of the file (step 3), where an unused value is a slip. |
| `group` bands rows that belong together | the rows of a group stand one after another, else M107 | a band stands above its first row only; rows of a group spread over the table would leave some outside their band. |
| A missing `scale=` is not covered | M100, an error that lists the scales | the header table has no required fields, and without a scale no cell can be read. |
| Look `plain` | the standard look of the kernel | `plain` belongs to `plugin-architecture`, which a plugin may not import; the standard look is what the UML kinds draw with, sets the letters in its mono face, and a theme repaints it like every other kind. |
| `cover=<rows\|cols\|both>` | as drafted; `scale=raci` and `scale=crud` cover nothing unless asked | as drafted. |

The codes are `M100` to `M107` for errors and `M600` for the warning about size (ADR 0011: one letter per plugin,
warnings from 600 on, as `S600` of `plugin-code`). Several values in one cell are drawn as one text in the order of
the scale, `R/A`.

Step 4 is built as well: the kind `concept` with `type`, `link`, `item` and `rel`, the declared rules, the legend
from the declarations, and the vocabularies `terms` and `roles`.

| Draft | Built | Why |
|---|---|---|
| An undeclared type or link is `L107` from `lang` | `M110` and `M111` of the kind, with the nearest declared id | a vocabulary's declarations stand in no line, so the language cannot resolve `is` or the link of a `rel`; the kind knows both sources. |
| Layered or `grid` placement | layered only | the layered picture needs nothing new from `layout-grid`; named cells come when a picture has to be compared cell by cell. |
| `shape=frame`, `in <ref>`, the unit of `roles` as a frame | not yet | frames around layered items need their members to stand together, which the layering does not promise; they come with the tiles of `capability` (step 6). |
| `tone=` on types, `scale` and `rate=` on items | not yet | shape and line carry every distinction so far, and the scale on items belongs to `capability`. |
| `starts=` and `ends=` badges | not yet | they come with `context-map` (step 5). |
| Two links of the same look were not foreseen | the flags `upward`, `beside` and `bare` on `link` | `upward` puts a broader term above the narrower and a lead above the team, `beside` stands a deputy or a synonym next to the other, `bare` leaves the label off a line whose head already tells it apart, as `is-a` does. |
| `M113` for every declaration given twice | only for a declaration the vocabulary already has | the language reports an id the file declares twice (`L108`) before the kind sees it. |
| A role that is its own deputy, a rule of `roles` | `M118` for every link: a relation joins two different items | a term that is part of itself or a task that creates itself says nothing either. |

The codes of `concept` are `M110` to `M119` for errors and `M610` to `M613` for warnings. Each kind has its own
entry point only once a host asks to load one without the other; until then the root registers both.

## Next steps, decided on 29.10.2026

The owner read a concept report on where `concept` goes next and decided three things.

| Decision | Consequence |
|---|---|
| A vocabulary becomes a file of its own, `diagram vocabulary`, that a picture names with `use=` in its header | plugins and templates can provide vocabularies later; `terms` and `roles` become vocabulary files the plugin ships, and a vocabulary can be drawn as a picture of its own |
| Views are fixed pictures, not interactive | one source gives several pictures of how a diagram is built: every area closed, one area opened in place among closed neighbours, or the overview with a lens on one area beside its inside. Relations are written once, at the step they belong to, and the closed area derives them |
| The look stays as it is for now | the standard look of `belege.dgr` and of a picture of risks and controls is the style to keep; tones, icons and bands per type come later |

The order is: the vocabulary as a file; frames with `in`, the inside of an item as a block, and the views `closed` and `open=`; lanes inside and the lens; properties with scales and the rules `distinct`, `needs`, `reach` and `within`; then `context-map` and `capability` as vocabulary files. Each is one pull request.
