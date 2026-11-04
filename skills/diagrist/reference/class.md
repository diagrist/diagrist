<!-- Generated from the statement tables and the rules of `class` by `pnpm docs:generate`. Do not edit. -->

# Kind `class`

A UML class diagram (UML 2.5.1, chapters 9 to 12): classes, interfaces and enumerations with their members, packages, and the relations between them. Diagrist lays it out by itself in layers: superclasses, interfaces, wholes and users above, associated classes side by side, each package as one block. Full reference with every argument: `dgr grammar class --json`.

```text
diagram class "Title" [subtitle=<text>] [look=<plain|cards>] [areas=<tint|outline|stripe>] [locale=<en|de>]
```

| Line | Where | What it does | Example |
|---|---|---|---|
| `class <id> <label> [in <ref>] [stereotype=<text>] [template=<text>] [tone=<choice>] [mark=<ref>] [area=<ref>] [abstract] [emph]` | top level | A class: a box with the name, below it the compartments of attributes and operations, shown even when empty. | `class order "Order" stereotype="entity"
  "- number : String {readOnly}"
  "+ total() : Money"` |
| `interface <id> <label> [in <ref>] [stereotype=<text>] [template=<text>] [tone=<choice>] [mark=<ref>] [area=<ref>] [abstract] [emph]` | top level | An interface: `«interface»` above the name, operations in italics; the attribute compartment only when it holds something. | `interface printable "Printable"
  "+ print() : String"` |
| `enum <id> <label> [in <ref>] [stereotype=<text>] [template=<text>] [tone=<choice>] [mark=<ref>] [area=<ref>] [abstract] [emph]` | top level | An enumeration: `«enumeration»` above the name, below it one value per line. | `enum status "Status"
  "OPEN"
  "PAID"` |
| `package <id> <label> [in <ref>] [tone=<choice>] [area=<ref>]` | top level | A package: a frame with a tab holding the name, around the classifiers `in` it. | `package domain "domain"` |
| `assoc <id> [label] [in <ref>] [class=<ref>] [mark=<ref>] [area=<ref>] [emph]` | top level | An n-ary association: a diamond joined to three or more classes. | `assoc lesson "Lesson" class=unit` |
| `rel <from> <arrow> <to> [label] [area=<ref>] [source=<multiplicity>] [card=<multiplicity>] [role=<text>] [srole=<text>] [nonav=<from\|to\|both>] [class=<ref>] [import] [access] [emph]` | top level | A relation between classifiers, read from `from` to `to`; the arrow says which (see the arrows). | `rel customer -- order "places" source=1 card=0..*` |
| `note <text> [on <ref>]` | top level | A comment on a classifier: a dashed box above it with a tip down to it, below it when lines run above. | `note "Exactly one lecturer per lesson" on lecturer` |
| `adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]` | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. | `adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"` |
| `area <id> <label> [tone=<choice>] [core]` | top level | A named area of the picture, such as the core or one extension of an extensible architecture. | `area kern "Kern"` |

The arrows of `rel`: `--` association, navigability open at both ends, `->` directed association, navigable towards `to` (open head there), `<->` association navigable at both ends (open heads at both), `-->` dependency, dashed with an open head at `to`; between packages with `import` or `access`, `-|>` generalization: `from` is a special kind of `to`, hollow triangle at `to`, `--|>` realization: `from` implements the interface `to`, dashed with a hollow triangle, `o--` aggregation: `from` is the whole, hollow diamond at `from`, `*--` composition: `from` is the whole that owns its parts, filled diamond at `from`.

Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).

The rules of `class` report these codes:

| Code | Severity | What it checks |
|---|---|---|
| `U410` | error | A realization `--\|>` runs from a class or enumeration to an interface: its target is an interface, its source is none. UML 2.5.1: 10.4.4 Realization of an interface, dashed with a hollow triangle. |
| `U411` | error | A generalization `-\|>` joins classifiers of one kind (class with class, interface with interface) and runs in no cycle; the triangle points at the more general one. A class implements an interface with `--\|>`. UML 2.5.1: 9.2.3.2 Generalization between classifiers. |
| `U412` | error | Only operations are abstract, and only in abstract classes and interfaces: an abstract operation of a concrete class has no implementation anywhere. UML 2.5.1: 9.6.4 Abstract operation, in italics. |
| `U413` | error | A member is a UML text: `[visibility] name : Type` for an attribute, `[visibility] name(p : Type) : Type` for an operation; a value of an enumeration is a plain name without `static` or `abstract`. UML 2.5.1: 9.5.4 Attribute with visibility, type, multiplicity and properties, 9.6.4 Operation with visibility, parameters, return type and properties, 10.2.4 Enumeration with its literals. |
| `U414` | error | Generalization, realization and dependency join types, not objects: their ends have no multiplicity and no role. UML 2.5.1: 7.7.4 Dependency as a dashed arrow, 9.2.3.2 Generalization between classifiers, 10.4.4 Realization of an interface, dashed with a hollow triangle. |
| `U415` | error | A part belongs to at most one whole at a time: the multiplicity at the whole of a composition `*--` is `1` or `0..1`. UML 2.5.1: 11.5.4 Composition with a filled diamond at the whole. |
| `U416` | error | A classifier names each attribute once and each operation once per list of parameter types; overloads with other parameter types are allowed. UML 2.5.1: 9.5.4 Attribute with visibility, type, multiplicity and properties, 9.6.4 Operation with visibility, parameters, return type and properties. |
| `U417` | error | An association class is an association and a class at once: `class=` stands on an association between classifiers or on an `assoc`, names a `class` (the table allows no other) that is none of its own ends, and each association class belongs to exactly one association. UML 2.5.1: 11.5.4 Association class joined by a dashed line. |
| `U418` | error | A package is no classifier: it is an end of dependencies `-->` only. `import` and `access` mark package imports, so they belong to dependencies `-->`. UML 2.5.1: 12.2.4 Package as a frame with its name in the tab, 7.4.4 Package import with the keyword «import» or «access». |
| `U419` | error | A package already holds its members; a dependency between a package and its own content says nothing. UML 2.5.1: 12.2.4 Package as a frame with its name in the tab, 7.7.4 Dependency as a dashed arrow. |
| `U470` | error | An end is navigable (open head), not navigable (x) or open. An x at an end with an arrowhead contradicts itself, and generalization, realization and dependency have no navigable ends. UML 2.5.1: 11.5.4 Navigable end with an open arrowhead, 11.5.4 Non-navigable end with a small x. |
| `U471` | error | A note in a class diagram is a comment on one classifier: it names it with `on`. UML 2.5.1: 7.2.3.2 Comment (note). |
| `U910` | warning | UML allows ends without multiplicity; exam practice, like the learning platform, asks for both ends of an association, aggregation or composition. A leg of an n-ary association needs it at the class end only. UML 2.5.1: 7.5.4 Multiplicity at an end or of a property. |
| `U911` | warning | Two relations between the same classifiers can only be told apart by a name or a role. UML 2.5.1: 11.5.4 Binary association as a line with its name, 11.5.4 Role name at an end of an association. |
| `U912` | warning | Packages should depend on each other without cycles (acyclic dependencies principle). Dependencies `-->` between packages and between classifiers of different packages count; UML allows cycles, so it is a warning, once per cycle. UML 2.5.1: 12.2.4 Package as a frame with its name in the tab. |
| `U913` | warning | A package without classifiers, also in its nested packages, has no frame: it is not drawn, and relations to it are left out. UML 2.5.1: 12.2.4 Package as a frame with its name in the tab. |
| `U916` | warning | `{readOnly}` makes an attribute unchangeable, `{query}` an operation free of side effects. Swapped, neither says anything; the text is drawn as written. UML 2.5.1: 9.5.4 Attribute with visibility, type, multiplicity and properties, 9.6.4 Operation with visibility, parameters, return type and properties. |
| `U917` | warning | An n-ary association joins three or more ends. With two legs it is a binary association, drawn as a line without diamond. UML 2.5.1: 11.5.4 N-ary association as a diamond with a leg to each end. |
| `U918` | warning | A leg of an n-ary association is a line from the diamond to a class: `--`, or `->` towards the class. Name and association class belong to the diamond, multiplicity and role to the class end; aggregation and composition exist only between two ends. UML 2.5.1: 11.5.4 N-ary association as a diamond with a leg to each end. |
