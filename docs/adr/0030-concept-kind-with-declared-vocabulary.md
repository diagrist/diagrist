# 30. A kind `concept` whose file declares its vocabulary

Date: 2026-10-29. Status: proposed; the owner decides on `docs/concept-and-matrix.md`. Builds on ADR 0003, 0004,
0005, 0006, 0015, 0021 and 0027.

## Context

A business concept needs pictures the catalogue of ADR 0027 does not hold: term models, context maps, capability
maps, role models, and pictures of a team's own types such as tasks and the documents they create. Each would be a
kind of its own with a grammar of its own, which is the race for kinds ADR 0027 refuses. A generic box-and-arrow kind
would hold them all, but has no rules to fail and makes Diagrist the drawing tool it refuses to be.

## Decision

1. **One kind, `concept`, whose file declares its vocabulary before it uses it.** `type` declares a type of thing
   with a shape from a closed table, `link` a type of relation with the types it may join, `item <id> <label> is
   <type>` one thing, and `rel <from> <link> <to>` one relation. The grammar stays static: the keywords are fixed,
   the declared ids are values (ADR 0004), so the grammar JSON and the docs are derived as for every kind.
2. **Every declaration is a rule, from a closed set.** `from=` and `to=` on a link, `each=` and `single=` for at
   least and at most one relation per item, `acyclic`, `explain` for an entry on every item of a type, and `starts=`
   and `ends=` for the badges a relation may carry at its ends. Broken declarations are errors, because the author
   stated them. There is no expression language: a rule the set cannot state is a reason for a vocabulary of the
   plugin or a kind.
3. **The declaration is the legend.** The legend lists the types and links the picture uses, with their shapes,
   lines and labels, and a declared but unused type is a warning. The description writes one sentence per relation
   from the link's label.
4. **Vocabularies of the plugin.** `vocabulary=context-map`, `capability`, `terms` and `roles` load declarations
   written once in the plugin, as tables, with a few rules in code where declarations do not reach. A file may add
   types and links to a vocabulary, never redeclare them. The scope's `domain` becomes the vocabulary `context-map`
   until message flows on its edges need a kind.
5. **Placement as in the existing families.** Without `grid` the items are layered along their links; with `grid`
   they take `at <col>/<row>` as in C4; frame types hold items `in` them, two levels deep at most, a third as entries.
   Badges at line ends move from `plugin-uml` into `layout-grid`, and tiles in rows of frames are added there.
6. **A plugin of its own.** `plugins/plugin-concept` holds `concept` and `matrix` (ADR 0031), one entry per kind as in
   ADR 0024, the shared `scale` tables in `src/shared`.

## Consequences

Four pictures of a business concept come with one grammar, and a team can draw its own types with rules a reviewer
can rely on. The risk is plain: a file with one type, one link and no constraints is a box drawer. Two things hold
against it. Every picture carries its declared legend, so it never pretends to mean more than it declares, and the
path from a file's vocabulary to a vocabulary of the plugin is where pictures that recur gain rules.

ADR 0027 point 2 is amended: `concept` enters the catalogue under the rule that its rules are declared, and `domain`
is served by a vocabulary. `type`, `item`, `rel`, `value` and `scale` join the general words of the architecture test
of kind words, like `node` and `group`. Vocabularies shared across files with `use`, and a vocabulary for domain
stories with numbered sentences, wait for a real diagram.
