# Before you hand a picture over

Run through this list every time. It takes a minute and catches what the check cannot know: whether the picture
says what was meant.

## 1. The check is clean

`dgr check <file> --json` reports nothing: no error and no warning. A warning is not noise. Each one names
something a reader will stumble over, such as two texts on top of each other (G400), a box reaching into a
frame it does not belong to (G403), an item without a relation (M612) or too many types (M611). If you keep a
warning on purpose, say why in a `#` comment above the line it points at.

The check also reads the lines of the picture and reports what makes them hard to follow. Each warning points at
the source line of the relation it is about:

| Code | The line |
|---|---|
| G410 | crosses another line |
| G411 | runs through a box or a text it does not join |
| G412 | bends more often than a reader follows at a glance |
| G413 | runs too short a way straight into its arrowhead |
| G414 | bends right after its start |
| G415 | jogs by a few pixels, which reads as a slip |
| G416 | runs so close beside another that both read as one |
| G417 | meets a box beside other lines in an order that makes them cross there |
| G418 | carries a text that lies on something else, or far from the line |

`dgr check <file> --metrics` adds a line of measures per picture: lines, crossings, stretches where two lines lie on
one another, bends and how many of them a straight line could have spared, the length of all lines, the size and
the longer side over the shorter. Use it to compare two versions of a picture. When you change the model,
crossings and bends should go down, never up.

## 2. The picture is built and you have looked at it

Run `dgr build <file> --png` and open the PNG. Then look at it the way the reader will:

- **Ten seconds:** cover the title. Can you tell what the picture is about? Then read the title. Does the picture
  show what the title claims?
- **The entry point:** is it obvious where to start reading? The core, the first lifeline or the initial state
  should be where the eye lands first.
- **Every line:** can you follow each line from its start to its head without losing it? Does each one say
  something the question needs?
- **Every text:** is it legible, does it sit next to what it names, and is it free of code names and
  abbreviations the reader does not know?
- **Colour:** does every colour mean something the legend explains? Is the core in ink and are the extensions
  told apart?
- **Size:** does it fit a slide or a page without zooming? If not, split it ([pictures.md](pictures.md)).

## 3. What to change when it looks wrong

| You see | Change |
|---|---|
| Lines that cross or run in loops (G410, G412) | Remove lines the question does not need, make their direction consistent, or for `concept` try another `arrange=` |
| One box with lines to everything | It answers the question alone: draw it in the middle as the core, or split the picture around it |
| Long rows of boxes | Too many things at one level: group them (package, partition, group), or merge those the reader does not tell apart |
| Labels crowding the lines (G418) | Shorten them to a verb phrase; with one or two kinds of relation, let the legend name them |
| A C4 edge jumping across cells | Swap the elements so that the ends are neighbours in the grid, or use `layout=adaptive` |
| A picture that needs explaining | It answers two questions: split it, or use a `variant` for the second |

Build again after each change and look again. When the picture is right, run `dgr fmt <file>` so the source is
tidy for the next person who changes it.

## 4. Hand it over with its source

Hand over the `.dgr` file along with the picture. The picture is only a print of it, and the next change starts
from the source. Name the file after what it shows, such as `kern-und-erweiterungen.dgr`, and keep the pictures of
one subject in one folder, with a shared vocabulary or base file used by all of them.
