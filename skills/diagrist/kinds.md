# Choosing a kind

Pick the kind by the question the picture answers, not by habit. The wrong kind makes a picture that is
correct and still says nothing.

| The reader asks | Kind | Reference |
|---|---|---|
| What is the system made of, and which parts can be added? | `concept` (hub of a core and its extensions) or `container` | [concept](reference/concept.md), [container](reference/container.md) |
| Who uses the system, and which systems are around it? | `context` | [context](reference/context.md) |
| Which applications and stores make up the system, and how do they talk? | `container` | [container](reference/container.md) |
| What is inside one application? | `component` | [component](reference/component.md) |
| Who calls whom, in which order, for one case? | `sequence` | [sequence](reference/sequence.md) |
| What does a process do, step by step, and who does each step? | `activity` | [activity](reference/activity.md) |
| Which states does a thing go through, and what moves it on? | `state` | [state](reference/state.md) |
| What can each user do with the system? | `usecase` | [usecase](reference/usecase.md) |
| How are the business objects related, and what owns what? | `class` (for developers) or `concept` (for the business) | [class](reference/class.md), [concept](reference/concept.md) |
| What does this term mean, and how do the terms relate? | `vocabulary`, `concept` with `vocabulary=terms` | [vocabulary](reference/vocabulary.md), [concept](reference/concept.md) |
| Who is responsible for what, or who reads and writes which data? | `matrix` with `scale=raci` or `scale=crud` | [matrix](reference/matrix.md) |
| Where in the code does this happen? | `code` | [code](reference/code.md) |

Stakeholders usually need `concept`, `context`, `container`, `activity` and `matrix`. Developers also read
`sequence`, `class`, `state`, `component` and `code`. If a stakeholder asks for a technical picture, draw the
next higher level first: a `context` before a `container`, a `concept` before a `class`.

## `concept`: the business, in its own words

A concept picture declares its own vocabulary: `type` for the kinds of thing, `link` for the kinds of relation,
then `item` and `rel`. The check holds every relation to its declaration, so the picture cannot say something the
vocabulary forbids.

- Declare 2 to 4 types and 1 or 2 links. Give each type a `shape=` that tells it apart.
- Write a relation as a sentence: `rel ausleihe nutzt flotte` reads "Ausleihe nutzt Flotte".
- Diagrist chooses the arrangement. It uses **columns** when most relations join items of different types (a
  story read from left to right), a **hub** when a core area is extended by two areas or more, and **layers**
  otherwise. Set `arrange=` only when the choice does not fit the question.
- For a core and its extensions, use areas and let the hub draw them ([areas.md](areas.md)). The core stands
  framed in the middle, the extensions dock at its sides, and every line points into the core.
- When several pictures share a subject, write the types and links once as a `vocabulary` file and build on it
  with `use=`.

## C4: `context`, `container`, `component`

C4 pictures are placed in a named grid: `grid cols` and `grid rows` name the columns and rows, and each element
stands `at column/row`. Here you do the placing, so place for reading.

- Put the people on the top or the left, your own system in the middle, and other systems on the right or the
  bottom. Put stores below what uses them.
- Place elements so that every edge runs between neighbouring cells. An edge that has to jump over a cell is a
  sign that two elements should swap.
- Give every edge a label or a protocol (`via=`); the kind warns otherwise (A710).
- `look=` changes the look. `cards` and `blocks` suit slides, `paper` a printed document with decisions in the
  margin (`adr`), and `columns` a technical sheet.
- `layout=adaptive` lets columns grow to their content and edges find their own way. Use it when the fixed grid
  crowds.

## `sequence`: one case, in order

- Draw one scenario per picture, such as "payment succeeds", and put the failure in a `variant` or its own
  picture. `alt` is for a short branch, not for a second story.
- Order lifelines from the one who starts on the left to the last one called on the right.
- Keep it to 3 to 7 lifelines and 5 to 15 messages for stakeholders. `autonumber` helps when the text around the
  picture refers to steps.
- Use `ref` for a part that has its own picture, rather than drawing it again.

## `activity`: a process and who does it

- Use one `partition` per role or system, ordered as the work flows. A step belongs to the partition of whoever
  does it.
- Name actions with a verb and an object: "Check payment", not "Payment".
- Name the guards of a decision as conditions the reader can check ("paid", "not paid").
- Draw parallel work as parallel branches, not as a sequence of steps that only seem to wait for each other.

## `state`: the life of one thing

- Draw one thing per picture, such as an order or a contract. Name states as conditions ("Waiting for payment"),
  and name transitions by the event that moves it on.
- Every state is reachable from the initial state, and every one that can end leads to a final state.
- Group states that share transitions into a composite state, rather than drawing the same transition from each
  of them.

## `class`: structure for developers

- Draw one aggregate or one module per picture. Show only the members the question needs; often none.
- Choose the relation by what it means: generalisation for "is a", composition for "owns and dies with",
  association for "knows". A picture where everything is an association says nothing.
- Use packages for modules. The layout keeps each package together.

## `usecase`: what each user can do

- Put the actors outside and the use cases inside the subject. Name a use case as a goal the actor has ("Rent a
  bike").
- Use `include` and `extend` sparingly. A use case diagram is not a flow chart.

## `matrix`: responsibilities and access

- Choose the scale by the question: `raci` for responsibility (the kind checks exactly one A and at least one R per
  row), `crud` for data access, and `cover` for "which requirement does which part cover".
- Put the things that are discussed in the rows and the people or systems in the columns.

## `code`: the code itself

- Show excerpts with `symbol`, `region` or `lines`, never whole files. Mark the lines that matter and explain them
  in numbered notes.
- The files are read at build time, so a picture breaks when the code it shows moves. That is intended: fix the
  excerpt.
