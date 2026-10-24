# 9. Ports between packages, so work can run in parallel

Date: 2026-10-24. Status: accepted.

## Context

The kernel, the first plugin and the CLI were built at the same time by different agents. That works when each
stream can be built and tested without the others, and when joining them is a small, planned step.

## Decision

1. **The consumer owns the port.** A package that needs another one defines the narrowest interface it uses
   (`Engine` in `packages/cli/src/engine.ts` is the first), in its own terms, data in and data out. The provider
   is joined by a small adapter when both exist. Dependencies point from consumer to port, never the other way.
2. **Test doubles only at ports.** Inside a package, tests use the real code. A fake stands in only for a port,
   and only in tests; production code never ships a fake.
3. **One stream, one worktree, one branch**, each owning clear paths (`packages/cli`, `packages/core`, `plugins/*`).
   Shared files (lockfile, root `tsconfig.json`, `knip.json`, `vitest.config.ts`) are expected merge points and
   are changed only additively.
4. **A stream is planned with three lines:** the paths it owns, the port it builds against, and where it joins.
   Joining is its own small change with a test that runs the real pieces together.
5. **Coupling stays low by rule, not by habit:** package boundaries come from `package.json` and are tested; the
   kernel knows no diagram kind; plugins never depend on each other; hosts (CLI, LSP, MCP) reach the kernel only
   through their port.

## Consequences

Streams do not wait for each other and their tests stay fast and honest. The price is a thin adapter per port,
and discipline about shared files.
