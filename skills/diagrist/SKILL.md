---
name: diagrist
description: Write, change, check and render Diagrist diagrams, text files ending in .dgr that the dgr command line turns into checked SVG and PNG pictures, and make pictures good enough to show to stakeholders. Use it when a diagram such as a sequence, usecase, activity, class, state, context, container, component, code, matrix, concept or vocabulary diagram is wanted as code, when a .dgr file is created or edited, when an architecture with a core and extensions is to be drawn, or when dgr reports a code such as L101 or U403.
---

# Diagrist

Diagrist turns a small text language into diagrams. Every statement, argument and attribute is listed in a table.
The check says what it found and what is allowed. The same file always gives the same picture, and Diagrist places
and routes everything by itself. Your job is what the picture says: which question it answers, what it shows and
what it leaves out. The tools take care of the rest, so look things up instead of guessing.

A valid file is not yet a good picture. Read [pictures.md](pictures.md) before you draw anything someone else will
look at.

## How to work

1. **Settle the question.** Write down, in one sentence, what the reader should know after looking at the
   picture, and who the reader is. Use [kinds.md](kinds.md) to pick the kind that answers that question.
2. **Look up the kind.** Read its reference below. `dgr grammar <kind> --json` prints the same statements as
   data, with every argument. Use only keywords and attributes that the reference lists.
3. **Write the file**, keeping to [pictures.md](pictures.md). For a core and its extensions, or any picture whose
   parts belong to different teams, products or phases, read [areas.md](areas.md).
4. **Check it** with `dgr check <file> --json`. Each diagnostic has a stable `code`, a `span` with line and column,
   and `values`. Its message names what was found, what is allowed and a correct example. Fix every error, read
   every warning, and check again until nothing is reported. Codes of the language and the kernel are explained in
   [reference/codes.md](reference/codes.md); a kind's own codes are at the end of its reference.
5. **Format and build** with `dgr fmt <file>`, then `dgr build <file> --png`, which writes the SVG and a PNG
   beside the file.
6. **Look at the PNG** and go through [review.md](review.md). The check proves the file is valid; only the picture
   shows whether it says what was meant. If it does not, change the model, not the wording, and build again.

## What to read when

| File | Read it |
|---|---|
| [pictures.md](pictures.md) | Before every picture: what makes a picture good, the limits and the habits that spoil it. |
| [kinds.md](kinds.md) | When choosing a kind, and for what makes a picture of that kind good. |
| [areas.md](areas.md) | When parts of a picture belong to a core, an extension, a team or a phase, and should be told apart by colour. |
| [review.md](review.md) | Before handing a picture over, and when a picture looks wrong. |
| [reference/language.md](reference/language.md) | How every file is written, the commands, variants and `use`. |
| [reference/codes.md](reference/codes.md) | When a code starting with `L`, `K` or `G` is reported. |

The reference of a kind lists every statement with its signature, its purpose and an example, its arrows and the
codes its rules report. Open only the one you need:

| Kind | Reference |
|---|---|
| `sequence` | [reference/sequence.md](reference/sequence.md) |
| `usecase` | [reference/usecase.md](reference/usecase.md) |
| `activity` | [reference/activity.md](reference/activity.md) |
| `class` | [reference/class.md](reference/class.md) |
| `state` | [reference/state.md](reference/state.md) |
| `context` | [reference/context.md](reference/context.md) |
| `container` | [reference/container.md](reference/container.md) |
| `component` | [reference/component.md](reference/component.md) |
| `code` | [reference/code.md](reference/code.md) |
| `matrix` | [reference/matrix.md](reference/matrix.md) |
| `concept` | [reference/concept.md](reference/concept.md) |
| `vocabulary` | [reference/vocabulary.md](reference/vocabulary.md) |

The `reference` folder is generated from the same tables that check the diagrams, so it cannot drift from what
`dgr` accepts. The other files are written by hand.

## Rules that hold everywhere

- Write the language the reader speaks. `locale=de` in the header sets the words Diagrist adds itself, such as
  the legend. Write labels in the same language.
- Let Diagrist place. No kind takes coordinates, apart from the named grid of the C4 kinds. If a picture comes out
  crowded, the model is too big or answers two questions, so split it.
- One file can hold several pictures. Write as-is and to-be, or option A and B, as `variant` blocks of one file
  instead of two copies that drift apart. Use `use` when several files share a base.
- Never hand over a picture you have not looked at.
