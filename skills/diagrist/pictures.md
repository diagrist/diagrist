# What makes a picture good

A good picture is one that a reader who was not in the room understands in under a minute, and that still says the
right thing a month later. A stakeholder will not read the source, will not ask what a box means and will not
forgive a picture that looks like chaos. Diagrist places and routes everything, so whether the picture is
readable depends almost entirely on what you put in it.

## One question per picture

Every picture answers one question, and its title says the answer, not the topic.

| Weak title | Good title |
|---|---|
| "Architecture" | "Rentals run in the core, payments and maintenance plug in" |
| "Order process" | "An order waits for payment before the warehouse sees it" |
| "Classes" | "A contract owns its positions, a customer only refers to it" |

If you need "and" to say what a picture shows, it is two pictures. Use `subtitle=` for the scope ("as of Q3",
"to-be after the migration"), not for a second message.

## Fewer things, said clearly

Count before you write. For stakeholders, aim for a picture that fits on one slide without zooming:

| What | For stakeholders | At most |
|---|---|---|
| Boxes (items, classes, states, containers) | 5 to 12 | about 20 |
| Kinds of box (types, shapes) | 2 to 4 | 6 (`concept` warns above, M611) |
| Kinds of line | 1 or 2 | 4 |
| Coloured areas | 2 to 5 | 6 (the kernel warns above, K106) |
| Words in a label | 1 to 3 | 5 |

Leave out what the reader does not need for the question: logging, configuration, infrastructure every system has,
and getters and setters. One box can stand for something the reader does not need to see inside, such as
"Payment provider" for three external services. When a picture grows past the limits, split it by question ("how
a rental starts" and "how a rental is billed") or by level (C4 `context` above `container`). Do not squeeze it.

## Names a stakeholder recognises

- Use the words of the business, not of the code: "Rental", not `RentalAggregateRoot`; "Customer account", not
  `user_svc`. Keep code names for `class` and `code` pictures written for developers.
- Use one word for one thing across every picture of a set. If the vocabulary matters, write it once as a
  `vocabulary` file and build on it with `use=`.
- Keep labels short. A box name of one to three words is best. A line label is a verb phrase ("books", "pays
  with", "reports to"), never a sentence.
- Say who acts: a line goes from the one that acts or depends to the one that is used, so arrows read as
  sentences, "Rental uses Fleet".

## Lines carry the meaning

Every line is a sentence the reader has to read, so each one must earn its place.

- **Draw the relations that answer the question.** For a hub picture, that is how each extension plugs into the
  core, not every call between extensions.
- **Keep one direction.** If dependencies point down, all of them point down. A picture whose arrows point
  whichever way they happen to point has nothing to read along. `concept` and `class` lay out in layers by
  direction, so a consistent direction gives a calm picture by itself.
- **Use few kinds of line.** Solid for "uses", dashed for "notifies" is already two things to learn. With one or
  two kinds of link, `concept` writes the verbs in the legend instead of on every line, which keeps the picture
  quiet.
- **Avoid cycles, unless the cycle is the message.** A cycle forces a line against the reading direction. If it is
  real, such as a state machine's retry, let it be. If it is accidental, it usually means one of its lines is a
  different kind of relation.
- **Label a line only when the label adds something** that its kind and its ends do not already say.

## Order and grouping

Diagrist breaks ties by the order of the source. Write the most important element first, then the rest in reading
order: lifelines from the one who starts to the one who ends, items from core to edge, states from start to end.
Things that belong together go next to each other in the source.

Group with what the kind offers: packages in `class`, partitions in `activity`, groups in C4 and subjects in
`usecase`. Areas ([areas.md](areas.md)) mark which part an element belongs to across groups.

## Colour and emphasis mean something

- Colour means membership: use `area=` to say which part of the system something belongs to. Never use colour as
  decoration. The legend explains every area by itself.
- `tone=` gives a single element its own colour. Use it rarely and never alongside areas for another meaning: a
  reader can learn one colour code per picture, not two.
- Emphasise one thing at most, such as the step being discussed, with `emph` where the kind has it. If everything
  stands out, nothing does.
- Use `status=planned` and `status=deprecated` (in `concept`) or a `variant` for change over time, rather than
  colours you would have to explain.

## Habits that spoil a picture

| Habit | Why it hurts | Do instead |
|---|---|---|
| Every class, every call, every table | The question disappears behind the detail | Leave out what the question does not need |
| Two messages in one picture | The reader does not know where to look | Two pictures, or a `variant` |
| Labels as sentences | Lines become text blocks that crowd each other | A verb phrase, details in the text around the picture |
| A new colour for every box | Colour stops meaning anything | Areas for parts, no colour otherwise |
| Arrows in both directions for one relation | The picture says twice what happens once | One arrow from the one who acts |
| Abbreviations and code names for stakeholders | The reader has to translate | The word the business uses |
| Hand-made legends as boxes | They take room and drift from the picture | The legend Diagrist writes |

## When the picture still looks wrong

When a picture comes out tangled, the model is almost always the cause, not the layout. Work through these in
order: remove lines that do not answer the question, make the direction consistent, merge boxes the reader does
not need to tell apart, split the picture. For `concept`, `arrange=` picks columns, layers or a hub when the
automatic choice does not fit the story ([kinds.md](kinds.md)). [review.md](review.md) lists what to look for.
