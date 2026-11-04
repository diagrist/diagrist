# Areas: a core and its extensions

An area names a part of the picture, such as the core of an extensible system, one extension, a team, a product
or a phase. Every element and line that belongs to it is painted in its tone, and the legend names it. A reader
then sees at a glance which part a box or a line belongs to, across groups and frames. Every kind has areas.

## Declaring them

```dgr
diagram concept "Die Ausleihe läuft im Kern, Zahlungen und Wartung docken an" locale=de
type modul "Modul" shape=round
type daten "Datenbestand" shape=store
link nutzt "nutzt" from=modul to=modul,daten

area kern "Kern" core
area zahlung "Zahlungen" tone=green
area wartung "Wartung" tone=orange

item ausleihe "Ausleihe" is modul area=kern
item flotte "Flotte" is modul area=kern
item fahrten "Fahrten" is daten area=kern
item tarif "Tarifrechner" is modul area=zahlung
item schaden "Schadensmeldung" is modul area=wartung

rel ausleihe nutzt flotte
rel ausleihe nutzt fahrten
rel tarif nutzt fahrten
rel schaden nutzt flotte
```

- `area <id> <label>` declares an area. `tone=` gives it one of eight tones: `green`, `orange`, `purple`, `red`,
  `yellow`, `teal`, `pink` and `sky`.
- The core takes no tone and stays in ink, black on white, so the extensions stand out against it. Mark it with
  `core`. Without the flag, the one area without a tone is the core.
- `area=` on an element puts it in the area. Members of a frame or group take the area of their frame unless they
  name their own.
- A line takes the area it names with `area=`. Otherwise it takes the coloured area of its start, or else that of
  its end. A line between an extension and the core is therefore drawn in the extension's tone, whichever way it
  points, and a line inside the core stays in ink.

## Rules for the tones

- Use at most six coloured areas; the kernel warns above that (K106). Beyond six, tones are hard to tell apart.
- Give every area its own tone (K107), and use every declared area (K105).
- Keep a tone's meaning across a set of pictures. If payments are green in the overview, they are green in every
  detail picture. Write the areas once in a shared file and `use` it.
- Use red and green for parts, not for good and bad. If one area is "to be removed", say so with a variant or a
  status, not with red.
- Do not mix areas with `tone=` on single elements for another meaning. A picture has one colour code.

## The look

`areas=` in the header decides how an area is painted. Each is a full look, so pick the one that suits where the
picture is shown:

| `areas=` | Looks like | Suits |
|---|---|---|
| `tint` (default) | A light fill in the tone and an outline in the tone | Slides and screens; the strongest signal |
| `outline` | The outline and the name in the tone, no fill | Pictures with many boxes, and print |
| `stripe` | A stripe of the tone at the left edge of each box | Dense pictures and documents where colour should stay quiet |

Lines and frames of an area take its tone in every look.

## Core and extensions in each kind

| Kind | How |
|---|---|
| `concept` | The hub arrangement: the core framed in the middle, each extension docked at the side it meets, every line pointing into the core. It is chosen by itself when a core area is extended by two areas or more. |
| `context`, `container`, `component` | Place the core in the middle columns of the grid and each extension on the side where it plugs in. Areas work in every look and alongside `group`. |
| `class`, `activity`, `state`, `usecase`, `sequence` | `area=` on classes, actions, states, use cases and lifelines, and on relations, edges, transitions and messages. |
| `matrix`, `code` | Areas on columns and rows, or on cards. |

## When it does not read

- **Everything is coloured.** The core has a tone. Remove it, so the core stays black.
- **The extensions blur together.** There are too many of them. Merge the small ones into one area, or draw two
  pictures.
- **Lines run between extensions.** In a hub, extensions should talk through the core. A line between two
  extensions is either a real coupling the reader should see, so keep it and say so in the title, or a detail to
  leave out.
