# Contributing

Thanks for helping. Diagrist is built in the open; a few rules keep it clean.

## Setup

```sh
pnpm install          # also activates the git hooks (core.hooksPath = .githooks)
pnpm check            # lint, typecheck, tests, dead code (knip)
```

The hooks need [gitleaks](https://github.com/gitleaks/gitleaks) on your PATH.

## Commits

- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), enforced by `.githooks/commit-msg`:
  `feat(plugin-uml): add combined fragments to sequence diagrams`
- Sign off every commit (`git commit -s`). By signing off you agree to the
  [Developer Certificate of Origin](https://developercertificate.org/).
- English in code, commits and public docs.

## Pull requests

- One topic per pull request, with tests. Golden files change only on purpose and the PR says why.
- Published packages change only with a changeset (`pnpm changeset`).

## Never commit

Secrets, `.env` files, private keys, absolute local paths or internal material. The pre-commit and pre-push hooks
and CI block the common cases; see `.githooks/forbidden-*`.
