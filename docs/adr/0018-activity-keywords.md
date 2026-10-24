# 18. Activity diagrams: keywords and where the layout lives

Date: 2026-10-24. Status: accepted, decided by Claude in Noel's absence, reversible. Builds on ADR 0002, 0005 and
0015.

## Context

The predecessor wrote activity diagrams with `group` for a swimlane, `region` for an interruptible region, `time`
for an accept time event and `decision` for the diamond, and one statement for all fourteen node keywords. Under
one keyword, one meaning (ADR 0002 Nr. 3) `group` is the frame of C4 diagrams, `time` the time constraint of
sequence diagrams and `region` the orthogonal region a state diagram will need. Its layout was a layered placer
with lanes, bars, diamonds and loops that no other kind draws.

## Decision

1. **New keywords where the old ones mean something else:** `partition` for the swimlane, `interruptible` (and
   `interruptible=` on nodes) for the interruptible region, `wait` for the accept time event action. These are the
   UML terms, or in the case of `wait` what the flow does there.
2. **`decision` stays.** With the decision bar on `adr`, it means only the decision node in every kind, and a new
   word would change every activity source for nothing. `go`, `initial`, `final`, `fork` and `join` keep their
   names; a state diagram may use them with the same UML meaning.
3. **One table per node keyword.** Which node takes a text, pins, `state=`, `call` or `tone=` is said by its table,
   so a wrong part is a language error that lists what is allowed, instead of the rules E436, E438 and W458.
4. **The layout is the predecessor's, ported area by area into the plugin.** It takes the layering steps from
   `layout-grid`, which now exports them (`acyclic`, `assignLayers`, `layerCost`, `neighbours`, `positions`), and
   keeps everything specific to activities in `src/activity/layout`.

## Consequences

Existing `.dia` sources need three renames, done by search and replace. The twelve examples render pixel for pixel
as before, with the same descriptions. A state plugin can take the layering from the library and, when it needs
loop channels or tracks too, move them there (`docs/burn-down.md`).
