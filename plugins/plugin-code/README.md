# @diagrist/plugin-code

Code diagrams for Diagrist: the kind `code`. A card shows an excerpt of a real source file, read when the picture is
built, so a picture of a method breaks the build when the method is renamed instead of showing a stale copy. Marks lay
a numbered band behind lines and explain them in notes below the card, and links draw an arrow from a call to the card
of what it calls. Cards stand one below the other.

```dgr
diagram code "Submit a transfer" locale=en
source submit "TransferService.submit" src="TransferService.java" symbol=submit
  mark 27-30 "Idempotent: the same key returns the first transfer."
source publish "Outbox.publish" src="Outbox.java" region=publish
link submit 34 -> publish "outbox.publish(event)"
```

A card selects its lines by `symbol=` (a declaration by name, with its annotations and doc comment, to its closing
brace), `region=` (between `#region` comments) or `lines=`, in that order of preference, since only the first follows
the code when lines move; `outline` folds member bodies. Highlighting, the excerpts and the style table of the code
come from `@diagrist/code`, so the C4 plugin can show the same cards later without depending on this plugin. The look
is that of the C4 sheet `paper`: warm paper, Inter for texts and notes, JetBrains Mono for code.

The statements, their attributes and the diagnostic codes (prefix `S`, ADR 0011) are in the generated
[language page](../../docs/language/code.md); the examples in `examples/ueberweisung` draw from the Java and SQL files
beside them. ADR 0026 explains why the kind is a plugin of its own.
