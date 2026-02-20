# Contributing

Thanks for helping improve `x402-devex-gateway`.

## CI/CD expectations (MVP)

For this 2-week MVP, every pull request is expected to pass the GitHub Actions `CI` workflow before merge.

### Required checks

The `quality-gate` job is the merge gate and depends on all required checks:

1. **Lint + typecheck + unit tests**
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:unit`
2. **Docs example validation**
   - `npm run docs:check`
3. **Integration test job**
   - `npm run test:integration`

If any of the above fail, `quality-gate` fails and merge should be blocked.

## Required npm scripts

CI expects the following npm scripts to exist in `package.json`:

- `lint`
- `typecheck`
- `test:unit`
- `docs:check`
- `test:integration`

The helper script `scripts/ci/run-npm-script.sh` intentionally fails if a required script is missing.

## Local pre-PR checklist

Run this locally before opening/updating a PR:

```bash
./scripts/ci/install.sh
npm run lint
npm run typecheck
npm run test:unit
npm run docs:check
npm run test:integration
```

## Release process (dry-safe)

- Creating a tag like `v0.1.0` triggers `.github/workflows/release.yml`.
- The release workflow validates code quality and publishes a GitHub Release with source artifact(s).
- It does **not** publish to package registries or cloud vendors by default (dry-safe / platform-neutral).

## Deploy smoke test

Use `.github/workflows/deploy-smoke.yml` to run a post-deploy smoke check against an endpoint that should return **HTTP 402** for unpaid requests.

At minimum, response JSON must include:

- `error.code`
- `error.message`

This keeps smoke checks lightweight and avoids cloud-specific dependencies.
