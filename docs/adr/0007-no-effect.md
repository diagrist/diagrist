# 7. No Effect in the kernel, the plugin API or diagnostics

Date: 2026-10-24. Status: accepted.

## Context

Effect is a strong choice for applications with processes, clocks, dependency injection and RPC, as T3 Code shows.
Diagrist is a library: pure functions from text to diagrams, with diagnostics as data.

## Decision

Kernel, plugin API and diagnostics use plain TypeScript: functions, data in, data out. No Effect runtime or types
in public signatures. A host such as a future cloud service may use it internally if it pays for itself.

## Consequences

Plugin authors and agents need no extra concepts, packages stay small for browsers and edge runtimes, and
determinism follows from pure functions instead of a runtime.
