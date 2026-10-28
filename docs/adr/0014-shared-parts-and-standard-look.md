# 14. Shared parts in `@diagrist/parts`, the standard look in the kernel

Date: 2026-10-24. Status: accepted. Carries out ADR 0008 Nr. 6.

## Context

Title header, decision bar, palette, strokes, font roles and base rules started in `plugin-uml`, because only
sequence diagrams used them. C4 now starts in its own plugin and draws the same header, the same `adr` cards and
marks, and a legend. Plugins may not depend on each other (ADR 0009), so the second user cannot reach these pieces
where they are.

## Decision

Each piece goes where its second user can reach it and where it belongs by nature:

| Where | What | Why there |
|---|---|---|
| `packages/core/src/standard` | palette, tones, strokes, dashes, font sizes and roles, base rules, arrowheads, `standardStyles` | It is the default that `compile({ theme })` overlays (ADR 0010), so it lives where the theme enters. |
| `packages/parts` | `adr` table and `decisionOf`, decision bar and marks, title header and `MARGIN`, legend mechanics, `PART_ROLES`, `WORDS` in every locale | Pieces drawn alike by several plugins, as tables, layout, scene and words; no kind. |
| the plugin | its kinds' rules, roles, fonts, layouts, and words such as the name of a kind | Only its own kinds draw them. |

`parts` is pure like the kernel and depends on `lang` and `core` only. The legend in `parts` is mechanics: it lays
out rows of samples and texts, while the plugin chooses the entries and draws the samples.

A piece moves out of a plugin only when a second plugin needs it, as these do now. The move changes no bytes: the
15 sequence examples keep their SVG, PNG, descriptions and diagnostics, and the legend reproduces the predecessor's
placement in its C4 context example.

## Consequences

C4 and later plugins import header, decision bar, legend and look instead of copying them, and one corporate theme
repaints every plugin. What `parts` exports is public API for every plugin that uses it.
