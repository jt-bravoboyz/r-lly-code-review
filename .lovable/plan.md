

# Fix: Update @capacitor/cli to Resolve tar Vulnerabilities

## Context

`@capacitor/cli` at `^8.0.0` pulls in `tar` as a transitive dependency, which has two high-severity advisories:

1. **GHSA-8qq5-rm4j-mr97** — Arbitrary file overwrite via insufficient path sanitization
2. **GHSA-r6q2-hw4h-h46w** — Race condition via Unicode ligature collisions on macOS APFS

These affect the CLI tool used during `npx cap sync` / `npx cap add` — not the runtime app — but should still be patched.

## Plan

### 1. Update `package.json`

Bump `@capacitor/cli` (and sibling packages for consistency) to latest 8.x:

```json
"@capacitor/android": "^8.0.1",
"@capacitor/cli": "^8.0.1",
"@capacitor/core": "^8.0.1"
```

The patched `tar` dependency is resolved in newer Capacitor CLI releases.

### 2. No code changes required

This is a dev-dependency version bump only. No application logic, configuration, or runtime behavior changes.

---

**Risk:** None — `@capacitor/cli` is a build/dev tool, not bundled into the app. Updating it does not affect runtime behavior.

