# 41. A low-fi look for concept sketches: `look=lowfi`, status by fill, lines in boxes, toned notes and remarks

Date: 2026-11-11. Status: proposed, decided by Claude for Noel, reversible. Builds on ADR 0003, 0022 and 0023.

## Context

Concept reports draw small flows by hand: a handful of boxes, 12 px text in a system face, ink #222, lines of
1.5 px, grey for what exists, white for what is new, dashed for what is optional, a title in bold over one to three
lines with a grey last line, and a warning in red below the picture. One such flow, a stored task planner, measured
760 × 250 by hand. Written as a C4 component diagram it came out at about 1,500 × 430 in `look=plain` and `paper`,
and four things could not be said: an optional trigger beside the usual way (`status=planned` writes "planned",
which is a statement about time, not about the way), grey and white as existing and new, more than one line in a
box (only `tech=`, so lines grew wide), and a coloured note or one without an element to point at.

## Decision

1. **`look=lowfi`** is a look as a value (ADR 0023): Inter, measured, as the nearest bundled face to `system-ui`,
   at 12 px for names and texts; ink and a second ink for second lines and edge texts; a compact grid (box
   128 × 44, column gap 96, row gap 80); small heads; texts on their line; legend as sentences. It brings three option values any look
   may pick: `header: title` (the title alone, `label=` in front as the inline header writes the kind), `status:
   fill` (status by the body alone, no word and no dot) and `nodeAlign: middle` (texts centred in the room right of
   the icon). Its grey fill means only "exists": frames, shared and deprecated boxes stay unfilled.
2. **`status=` takes `optional`, `existing` and `new`** besides `planned` and `deprecated`. Every look draws every
   status: a word in `plain`, `cards`, `blocks`; a dot of its own colour in `paper` and `columns`; the fill in
   `lowfi` (dashed, grey, white). The sentence legend joins sentences with the same sight, so a dashed dependency and
   a dashed optional box read `Dashed: dependency / optional`.
3. **Indented texts below an element are lines of its box** (entries, ADR 0003, as `item` of `concept` has them),
   drawn between the name and `tech=` in the `description` font. The box grows by a line for each, the placement
   check sees every line, and the description lists them. `lines="a|b"` or `body=` were rejected: entries are the
   language's means for this, a separator inside a text would be new.
4. **`note` takes `tone=`** for its frame and text, and **`note` without `on`** is a remark below the picture, above
   the decision bar and the legend, wrapped to the width of the picture. A001, which required `on`, is gone; every
   file that checked before checks the same. A keyword of its own (`caption`, `remark`) was rejected: it is still a
   note, only without an element.
5. **Two measures of a look are new and optional**, so no other look moves a byte: `labelWrap`, the widest line of
   an edge's text in sizes of its font (the grid's `WRAP_EM` of 16 without it, `layout-grid` takes it as
   `GridMetrics.labelWrap`), and `bareRowY`, the top of the first row of a picture without frames. A cylinder is at
   least 56 px high in every look, which every look met already.

## Consequences

The planner of the report is `examples/architecture/planer.dgr`: 944 × 448 with title, remark and legend, checked
clean, against 760 × 250 for the hand drawing without them and about 1,500 × 430 in `look=plain` before. Every example of the other looks keeps its bytes.

What we learned building it, for the next look:

- Neither grid widens a gap for the text of an edge in it, and no grid widens a frame for its head. In a gap of 56 px
  a text of two words wraps (`je Aufgabe`) and is reported as too far from its line (G418), and one word such as
  `asynchronous` lies on the next box in a fixed grid (G400); a frame around a box of 88 px is narrower than its
  head `shared infrastructure` (G402). The website's catalog draws such tiles in every look, so `lowfi` keeps a gap
  of 96 px and boxes of at least 128 px, which costs the planner about 130 px of width. Gaps that grow to their
  texts and frames that grow to their heads in `layout-grid` would let it shrink to the hand drawing's 760 px.
- Texts beside their line collide with flow numbers in a narrow gap of a fixed grid (G400, G418); texts on their
  line (`edgeText.place: onLine`, as paper does) keep clear, so `lowfi` puts them there.
- `firstRowY` has to leave room for the heads of frames above the first row; a picture without frames does not need
  it, hence `bareRowY`. Two neighbouring ports need the kernel's 16 px (G417), so `portSpread` cannot shrink with
  the rest. A fixed grid with people needs a row gap of about 80 px for the captions under their busts.
- A cylinder's lid takes 27 px of a box; with two lines of text it needs 56 px, more than the 44 px of a low box.
- `radverleih/kontext` in `lowfi` keeps one line with three bends on its fixed grid (G412), so it has no `lowfi`
  example; `layout=adaptive` does not remove it either.
