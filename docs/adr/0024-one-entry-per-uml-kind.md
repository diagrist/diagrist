# 24. One entry per UML kind, one package for now

Date: 2026-10-24. Status: accepted, decided by Claude in Noel's absence, reversible. Builds on ADR 0008 and 0019.

## Context

`@diagrist/plugin-uml` holds five kinds that share little: `src/shared` is a few hundred lines next to more than
twenty thousand in the kinds. Its one entry registered all of them, so a host that draws sequence diagrams loaded
use cases, activities, classes and state machines with them, about 690 kB of code. The second review asked for an
entry per kind now and a decision on a package per kind before the first release, since splitting packages after
publishing breaks their names.

## Decision

The package stays one package. Beside the root, which registers every kind as `umlPlugin`, it exports one subpath
per kind: `@diagrist/plugin-uml/sequence`, `/usecase`, `/activity`, `/class` and `/state`, each a plugin with that
kind and its messages (`sequencePlugin` and so on), built from `src/<kind>/index.ts`. The root is composed from
these five, so the two cannot drift apart. Each kind keeps its own words in `describe/`, where a shared `src/texts`
used to collect all of them, and an entry therefore pulls in its kind, `src/shared` and the catalog of `src/spec` it
cites, nothing else. The architecture test of kinds checks this transitively: no file of a kind reaches another
kind's folder, also not through a shared folder.

Built with tsdown, the entries measure as follows, without the `@diagrist` packages they depend on:

| Entry | Code | gzip |
|---|---|---|
| `@diagrist/plugin-uml` | 691.5 kB | 204.1 kB |
| `/sequence` | 154.5 kB | 44.9 kB |
| `/usecase` | 110.9 kB | 34.2 kB |
| `/activity` | 154.1 kB | 46.5 kB |
| `/class` | 133.6 kB | 41.2 kB |
| `/state` | 158.9 kB | 46.4 kB |

A package per kind, with `src/shared` and `src/spec` in a common package, is the physical form of the same cut. It
comes when a real user needs it, such as a host that must not even install the other kinds, and not before: five
packages and a common one would mean six versions, six tarballs and six READMEs to keep in step, for a saving that
the subpaths already give to every bundler.

## Consequences

Hosts choose between the root and a kind's entry; the CLI keeps the root. A new kind adds its folder with an
`index.ts` and an export in `package.json`, from which the build derives its entries. Should the packages be split
later, the subpaths name the cut, and each becomes the root of its own package.
