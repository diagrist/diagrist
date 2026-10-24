<!-- Generated from the statement tables of the kind `class` (plugin `uml`) and its rules by `pnpm docs:generate`. Do not edit. -->

# `class`

A UML class diagram (UML 2.5.1, chapters 9 to 12): classes, interfaces and enumerations with their members, packages, and the relations between them. Diagrist lays it out by itself in layers: superclasses, interfaces, wholes and users above, associated classes side by side, each package as one block.

This page lists everything a `class` diagram may contain. The same grammar is available as data with `dgr grammar class --json`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.

## The first line

```text
diagram class "Title" [subtitle=<text>] [look=<plain|cards>] [locale=<en|de>]
```

Every class diagram starts with this line.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `subtitle=` | attribute | a text in double quotes like `"Order service"` | Second line below the title. |
| `look=` | attribute | one of `plain`, `cards` | `plain` (default) draws the UML notation, `cards` the same layout as cards with a toned name field and toned packages. |
| `locale=` | attribute | one of `en`, `de` | Language of the texts Diagrist adds to the picture and of the description: `en` (default) or `de`. |

Example:

```dgr
diagram class "Title"
```

## Statements

Each statement is one line that starts with its keyword. Statements inside blocks are indented below them.

| Statement | Where | What it does |
|---|---|---|
| [`class`](#class) | top level | A class: a box with the name, below it the compartments of attributes and operations, shown even when empty. |
| [`interface`](#interface) | top level | An interface: `«interface»` above the name, operations in italics; the attribute compartment only when it holds something. |
| [`enum`](#enum) | top level | An enumeration: `«enumeration»` above the name, below it one value per line. |
| [`package`](#package) | top level | A package: a frame with a tab holding the name, around the classifiers `in` it. |
| [`assoc`](#assoc) | top level | An n-ary association: a diamond joined to three or more classes. |
| [`rel`](#rel) | top level | A relation between classifiers, read from `from` to `to`; the arrow says which (see the arrows). |
| [`note`](#note) | top level | A comment on a classifier: a dashed box above it with a tip down to it, below it when lines run above. |
| [`adr`](#adr) | top level | An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. |

### `class`

```text
class <id> <label> [in <ref>] [stereotype=<text>] [template=<text>] [tone=<choice>] [mark=<ref>] [abstract] [emph]
```

A class: a box with the name, below it the compartments of attributes and operations, shown even when empty. Members follow indented, one per line. Diagrist places classifiers in layers: superclasses and interfaces above, the whole above its parts, the user above what it uses, associated classes side by side. UML 2.5.1: 11.4.4 Class with compartments for attributes and operations.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `rel`, `note` and `class=` use for this classifier. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the box. |
| `in <ref>` | clause | the id of a `package` declared in this diagram | The package the classifier belongs to. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `entity` shows `«entity»`. |
| `template=` | attribute | a text in double quotes like `"Order service"` | Template parameters such as `"T"` or `"K, V"`, drawn in a dashed box at the top right corner. UML 2.5.1: 7.3.4 Template parameters in a dashed box at the top right corner. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the name field in `look=cards`; without it slate. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it. |
| `abstract` | flag |  | An abstract classifier: the name in italics with `{abstract}` below it. UML 2.5.1: 9.2.4 Abstract classifier, its name in italics. |
| `emph` | flag |  | Highlights the box in the accent colour. |

Example:

```dgr
class order "Order" stereotype="entity"
  "- number : String {readOnly}"
  "+ total() : Money"
```

Indented lines that start without one of these keywords have this form:

```text
<text> [static] [abstract]
```

A member of the classifier as a UML text in double quotes, one per line: an attribute `"- name : Type"` or an operation `"+ total(tax : Rate) : Money"`. Visibility (`+ - # ~`) and the operation (by its parenthesis) are read from the text, as are multiplicities and properties such as `[1..*]` and `{readOnly}`. In an `enum` each line is a value. Members never wrap; the box grows to the widest one. UML 2.5.1: 9.5.4 Attribute with visibility, type, multiplicity and properties, 9.6.4 Operation with visibility, parameters, return type and properties.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | The member as UML writes it, such as `"- iban : String {readOnly}"`. |
| `static` | flag |  | A member of the class, not of its instances: drawn underlined. UML 2.5.1: 9.4.4 Static feature, underlined. |
| `abstract` | flag |  | An operation without implementation: drawn in italics. Only in abstract classes and interfaces. UML 2.5.1: 9.6.4 Abstract operation, in italics. |

Examples:

```dgr
"- name : String"
"+ total() : Money" abstract
```

### `interface`

```text
interface <id> <label> [in <ref>] [stereotype=<text>] [template=<text>] [tone=<choice>] [mark=<ref>] [abstract] [emph]
```

An interface: `«interface»` above the name, operations in italics; the attribute compartment only when it holds something. Members follow indented, one per line. Diagrist places classifiers in layers: superclasses and interfaces above, the whole above its parts, the user above what it uses, associated classes side by side. UML 2.5.1: 10.4.4 Interface with the keyword «interface».

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `rel`, `note` and `class=` use for this classifier. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the box. |
| `in <ref>` | clause | the id of a `package` declared in this diagram | The package the classifier belongs to. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `entity` shows `«entity»`. |
| `template=` | attribute | a text in double quotes like `"Order service"` | Template parameters such as `"T"` or `"K, V"`, drawn in a dashed box at the top right corner. UML 2.5.1: 7.3.4 Template parameters in a dashed box at the top right corner. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the name field in `look=cards`; without it slate. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it. |
| `abstract` | flag |  | An abstract classifier: the name in italics with `{abstract}` below it. UML 2.5.1: 9.2.4 Abstract classifier, its name in italics. |
| `emph` | flag |  | Highlights the box in the accent colour. |

Example:

```dgr
interface printable "Printable"
  "+ print() : String"
```

Indented lines that start without one of these keywords have this form:

```text
<text> [static] [abstract]
```

A member of the classifier as a UML text in double quotes, one per line: an attribute `"- name : Type"` or an operation `"+ total(tax : Rate) : Money"`. Visibility (`+ - # ~`) and the operation (by its parenthesis) are read from the text, as are multiplicities and properties such as `[1..*]` and `{readOnly}`. In an `enum` each line is a value. Members never wrap; the box grows to the widest one. UML 2.5.1: 9.5.4 Attribute with visibility, type, multiplicity and properties, 9.6.4 Operation with visibility, parameters, return type and properties.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | The member as UML writes it, such as `"- iban : String {readOnly}"`. |
| `static` | flag |  | A member of the class, not of its instances: drawn underlined. UML 2.5.1: 9.4.4 Static feature, underlined. |
| `abstract` | flag |  | An operation without implementation: drawn in italics. Only in abstract classes and interfaces. UML 2.5.1: 9.6.4 Abstract operation, in italics. |

Examples:

```dgr
"- name : String"
"+ total() : Money" abstract
```

### `enum`

```text
enum <id> <label> [in <ref>] [stereotype=<text>] [template=<text>] [tone=<choice>] [mark=<ref>] [abstract] [emph]
```

An enumeration: `«enumeration»` above the name, below it one value per line. Members follow indented, one per line. Diagrist places classifiers in layers: superclasses and interfaces above, the whole above its parts, the user above what it uses, associated classes side by side. UML 2.5.1: 10.2.4 Enumeration with its literals.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `rel`, `note` and `class=` use for this classifier. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the box. |
| `in <ref>` | clause | the id of a `package` declared in this diagram | The package the classifier belongs to. |
| `stereotype=` | attribute | a text in double quotes like `"Order service"` | Stereotype above the name, written without guillemets: `entity` shows `«entity»`. |
| `template=` | attribute | a text in double quotes like `"Order service"` | Template parameters such as `"T"` or `"K, V"`, drawn in a dashed box at the top right corner. UML 2.5.1: 7.3.4 Template parameters in a dashed box at the top right corner. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of the name field in `look=cards`; without it slate. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it. |
| `abstract` | flag |  | An abstract classifier: the name in italics with `{abstract}` below it. UML 2.5.1: 9.2.4 Abstract classifier, its name in italics. |
| `emph` | flag |  | Highlights the box in the accent colour. |

Example:

```dgr
enum status "Status"
  "OPEN"
  "PAID"
```

Indented lines that start without one of these keywords have this form:

```text
<text> [static] [abstract]
```

A member of the classifier as a UML text in double quotes, one per line: an attribute `"- name : Type"` or an operation `"+ total(tax : Rate) : Money"`. Visibility (`+ - # ~`) and the operation (by its parenthesis) are read from the text, as are multiplicities and properties such as `[1..*]` and `{readOnly}`. In an `enum` each line is a value. Members never wrap; the box grows to the widest one. UML 2.5.1: 9.5.4 Attribute with visibility, type, multiplicity and properties, 9.6.4 Operation with visibility, parameters, return type and properties.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | The member as UML writes it, such as `"- iban : String {readOnly}"`. |
| `static` | flag |  | A member of the class, not of its instances: drawn underlined. UML 2.5.1: 9.4.4 Static feature, underlined. |
| `abstract` | flag |  | An operation without implementation: drawn in italics. Only in abstract classes and interfaces. UML 2.5.1: 9.6.4 Abstract operation, in italics. |

Examples:

```dgr
"- name : String"
"+ total() : Money" abstract
```

### `package`

```text
package <id> <label> [in <ref>] [tone=<choice>]
```

A package: a frame with a tab holding the name, around the classifiers `in` it. Packages nest with `in`. Between packages, and between a package and a classifier, only dependencies `-->` exist, optionally with `import` or `access`. A package without classifiers is not drawn. UML 2.5.1: 12.2.4 Package as a frame with its name in the tab.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that `in`, `rel` and `note` use for this package. |
| `<label>` | argument | a text in double quotes like `"Order service"` | Name shown in the tab. |
| `in <ref>` | clause | the id of a `package` declared in this diagram | The package this one is nested in. |
| `tone=` | attribute | one of `blue`, `indigo`, `purple`, `maroon`, `green`, `teal`, `slate`, `red`, `orange`, `peach`, `sky` | Colour of its area in `look=cards`; without it slate. |

Examples:

```dgr
package domain "domain"
package persistence "persistence" in backend
```

### `assoc`

```text
assoc <id> [label] [in <ref>] [class=<ref>] [mark=<ref>] [emph]
```

An n-ary association: a diamond joined to three or more classes. Each end is a leg `rel <assoc> -- <class> card=... role=...`; multiplicity and role stand at the class end and say how many objects there belong to one fixed combination of the other ends. The name stands at the top right of the diamond. Diagrist places the diamond in the middle of its ends: the first two left and right, the third below, the fourth (or the association class) above. UML 2.5.1: 11.5.4 N-ary association as a diamond with a leg to each end.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id that the legs `rel <id> -- <class>` use. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name of the association, shown at the top right of the diamond. |
| `in <ref>` | clause | the id of a `package` declared in this diagram | The package the association belongs to. |
| `class=` | attribute | the id of a `class` declared in this diagram | The association class: a class that is this association, joined dashed to the diamond. UML 2.5.1: 11.5.4 Association class joined by a dashed line. |
| `mark=` | attribute | the id of an `adr` declared in this diagram | Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it. |
| `emph` | flag |  | Highlights the diamond in the accent colour. |

Example:

```dgr
assoc lesson "Lesson" class=unit
```

### `rel`

```text
rel <from> <arrow> <to> [label] [source=<multiplicity>] [card=<multiplicity>] [role=<text>] [srole=<text>] [nonav=<from|to|both>] [class=<ref>] [import] [access] [emph]
```

A relation between classifiers, read from `from` to `to`; the arrow says which (see the arrows). `card=` and `role=` stand at `to`, `source=` and `srole=` at `from`. Generalizations and realizations with the same target share one triangle. A relation of a class with itself is a loop. A leg of an n-ary association runs from the `assoc` to a class.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<from>` | argument | the id of a `class`, `interface`, `enum`, `assoc` or `package` declared in this diagram | Classifier, n-ary association or package the relation starts at. |
| `<arrow>` | argument | one of the arrows `--` association, navigability open at both ends, `->` directed association, navigable towards `to` (open head there), `<->` association navigable at both ends (open heads at both), `-->` dependency, dashed with an open head at `to`; between packages with `import` or `access`, `-\|>` generalization: `from` is a special kind of `to`, hollow triangle at `to`, `--\|>` realization: `from` implements the interface `to`, dashed with a hollow triangle, `o--` aggregation: `from` is the whole, hollow diamond at `from`, `*--` composition: `from` is the whole that owns its parts, filled diamond at `from` | What kind of relation it is. UML 2.5.1: `--` 11.5.4 Binary association as a line with its name; `->` 11.5.4 Binary association as a line with its name, 11.5.4 Navigable end with an open arrowhead; `<->` 11.5.4 Binary association as a line with its name, 11.5.4 Navigable end with an open arrowhead; `-->` 7.7.4 Dependency as a dashed arrow; `-\|>` 9.2.3.2 Generalization between classifiers; `--\|>` 10.4.4 Realization of an interface, dashed with a hollow triangle; `o--` 11.5.4 Shared aggregation with a hollow diamond at the whole; `*--` 11.5.4 Composition with a filled diamond at the whole. |
| `<to>` | argument | the id of a `class`, `interface`, `enum`, `assoc` or `package` declared in this diagram | Classifier, n-ary association or package the relation points to. |
| `[label]` | optional argument | a text in double quotes like `"Order service"` | Name of the relation, shown at the middle of the line. |
| `source=` | attribute | a UML multiplicity like `1`, `0..1`, `1..*` or `*`, the lower bound not above the upper one | Multiplicity at `from`: how many `from` belong to one `to`. UML 2.5.1: 7.5.4 Multiplicity at an end or of a property. |
| `card=` | attribute | a UML multiplicity like `1`, `0..1`, `1..*` or `*`, the lower bound not above the upper one | Multiplicity at `to`: how many `to` belong to one `from`. UML 2.5.1: 7.5.4 Multiplicity at an end or of a property. |
| `role=` | attribute | a text in double quotes like `"Order service"` | Role name at `to`, written opposite the multiplicity. UML 2.5.1: 11.5.4 Role name at an end of an association. |
| `srole=` | attribute | a text in double quotes like `"Order service"` | Role name at `from`. UML 2.5.1: 11.5.4 Role name at an end of an association. |
| `nonav=` | attribute | one of `from`, `to`, `both` | Ends that are not navigable: a small x shortly before the end. Only on associations, never at an end with an arrowhead. UML 2.5.1: 11.5.4 Non-navigable end with a small x. |
| `class=` | attribute | the id of a `class` declared in this diagram | The association class: a class that is this association too, joined dashed to the middle of the line and placed below it. UML 2.5.1: 11.5.4 Association class joined by a dashed line. |
| `import` | flag |  | A package import `«import»` on a dependency `-->`. UML 2.5.1: 7.4.4 Package import with the keyword «import» or «access». |
| `access` | flag |  | A private package import `«access»` on a dependency `-->`. UML 2.5.1: 7.4.4 Package import with the keyword «import» or «access». |
| `emph` | flag |  | Highlights the line in the accent colour. |

The values of `arrow` and what they mean:

| Value | Meaning |
|---|---|
| `--` | association, navigability open at both ends |
| `->` | directed association, navigable towards `to` (open head there) |
| `<->` | association navigable at both ends (open heads at both) |
| `-->` | dependency, dashed with an open head at `to`; between packages with `import` or `access` |
| `-\|>` | generalization: `from` is a special kind of `to`, hollow triangle at `to` |
| `--\|>` | realization: `from` implements the interface `to`, dashed with a hollow triangle |
| `o--` | aggregation: `from` is the whole, hollow diamond at `from` |
| `*--` | composition: `from` is the whole that owns its parts, filled diamond at `from` |

Examples:

```dgr
rel customer -- order "places" source=1 card=0..*
rel order *-- item source=1 card=1..*
rel invoice -|> document
rel repo --|> port
rel student -- course "takes" source=* card=* class=enrolment
rel web --> domain import
```

### `note`

```text
note <text> [on <ref>]
```

A comment on a classifier: a dashed box above it with a tip down to it, below it when lines run above. UML 2.5.1: 7.2.3.2 Comment (note).

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<text>` | argument | a text in double quotes like `"Order service"` | What the note says, in one line. |
| `on <ref>` | clause | the id of a `class`, `interface` or `enum` declared in this diagram | The classifier the note belongs to. Required. |

Example:

```dgr
note "Exactly one lecturer per lesson" on lecturer
```

### `adr`

```text
adr <id> <question> <equals> <choice> [then] [consequence] [open=<text>]
```

An architecture decision in the bar below the picture: question, the chosen option after `=`, and the consequence after `=>`. `mark=` with its id puts the mark into the picture.

Written at the top level.

| Part | Kind | Value | Meaning |
|---|---|---|---|
| `<id>` | argument | an identifier like `api` (letters, digits, `_` and `-`, starting with a letter) | Id of the decision, such as `E1`; `mark=E1` refers to it. |
| `<question>` | argument | a text in double quotes like `"Order service"` | The question that was decided. |
| `<equals>` | argument | one of the arrows `=` | Separates the question from the choice. |
| `<choice>` | argument | a text in double quotes like `"Order service"` | The chosen option. |
| `[then]` | optional argument | one of the arrows `=>` | Introduces the consequence. |
| `[consequence]` | optional argument | a text in double quotes like `"Order service"` | What follows from the choice. |
| `open=` | attribute | a text in double quotes like `"Order service"` | Who still decides an open question; the card is drawn dashed. |

Example:

```dgr
adr E1 "How do the services coordinate?" = "Events over Kafka" => "No central coordinator"
```

## Diagnostic codes

Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of `class` report these. An error stops the build; a warning is printed and the picture is still drawn.

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
