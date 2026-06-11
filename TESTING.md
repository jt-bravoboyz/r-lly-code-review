# Testing Guide

## The rule

Every new feature that adds logic to src/lib/ or src/hooks/ MUST include a corresponding test file. This is enforced by CI — coverage below threshold fails the build.

If you add src/lib/foo.ts, you must add src/lib/foo.test.ts.
If your change is purely UI with no extractable logic, document that in the PR template checklist.

## Stack
- **Vitest** (`jsdom` env, globals on, setup at `src/test/setup.ts`).
- **Coverage** via `@vitest/coverage-v8` (scoped to `src/lib` and `src/hooks`).

## Commands
```bash
npm test            # watch
npm run test:run    # one-shot (CI)
npm run test:coverage
```

## CI
`.github/workflows/test.yml` runs `npm run test:run` on every push/PR to `main` and `production`.

## Conventions

### What to test
- **Pure utilities** in `src/lib/**` — direct unit tests.
- **Pure hook logic** — mock Capacitor / browser APIs sparingly.
- **Component business logic** — extract the predicate/calculation into a pure function and test that function (the "stress-test pattern"), not the component.

### What NOT to test
- Page-level components, anything that needs a full Supabase mock or React Router context.
- Animations / splash / overlay components with no logic.
- Edge functions (Deno runtime — separate test environment).

### Stress-test pattern
When a component's behavior is driven by a boolean predicate, **copy the predicate** into the test file as a pure function and test it there (see `src/test/stress-tests.test.ts` and `stress-tests-2.test.ts`). This avoids brittle component mounting and keeps tests fast.

### File naming
- `src/lib/foo.test.ts` — co-located with the unit.
- `src/test/<topic>.test.ts` — cross-cutting stress tests.
