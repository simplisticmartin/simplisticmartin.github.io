# CASCADE release audit

CASCADE is releasable only when the local audit and the deployed smoke test agree. The release contract covers five layers:

| Layer | Gate |
| --- | --- |
| 0 / deployment | The page exposes the expected engine version and the deploy-resolved GitHub revision. |
| 1 / engine | Seeded simulation, causal recovery, SLO impact, deterministic state hashes, terminal deadlines, and duplicate-action handling pass. |
| 2 / features | NOVA, the runbook deck, recruiter mode, freeplay, presentation mode, onboarding, and replay contracts pass independently. |
| 3 / integration | NOVA + deck + recruiter/freeplay combinations reset safely and remain deterministic. |
| 4 / player | A 90-second recruiter run has a guided first action, a reachable postmortem, and a replayable build. |

## Local gate

Run from the repository root:

```bash
node --check assets/js/cascade-engine.js
node --check assets/js/cascade-worker.js
node --check assets/js/cascade.js
node --check assets/js/cascade-nova.js
node --check assets/js/cascade-audit.js
node --check scripts/cascade-smoke.js
node assets/js/cascade-audit.js
```

The audit writes `cascade-audit-report.json`. It covers:

- deterministic seeded snapshots and replay hashes;
- observable-only active scenarios with no `root`, `rootCause`, or `correctAction` leak;
- causal golden incidents for database exhaustion, edge surge, retries, cache, certificate, queue, memory, release, regional, and DNS failures;
- runbook card fields, deterministic offers, lifecycle transitions, duplicate-card protection, and combinations;
- NOVA healthy-state abstention, database grounding, capacity reasoning, optional operation, and reproducible false leads;
- recruiter/freeplay budgets and 1,000-seed invariant fuzzing.

## Production parity gate

After the intended commit is deployed, run:

```bash
CASCADE_VERSION=0.5.1-audit GITHUB_SHA=$(git rev-parse HEAD) \\
  node scripts/cascade-smoke.js https://simplisticmartin.github.io/cascade/
```

The smoke test must find the same version, a seven-character production commit marker, NOVA, the runbook deck, presentation mode, and onboarding. A stale GitHub Pages build is a **real failure**, not a reason to weaken the check. The page also exposes `window.CASCADE_BUILD` so browser-based checks can compare the runtime identity.

The Jekyll page resolves its displayed commit from `site.github.build_revision`, falling back to the checked-in manifest only for local builds. `_data/cascade-build.json` and `assets/data/cascade-build.json` must keep the same version and release metadata.

## CI behavior

`.github/workflows/cascade-audit.yml` runs syntax checks and the dependency-free audit on pull requests and pushes. A push to `master` additionally runs the production parity smoke test against the public CASCADE URL. This intentionally fails until GitHub Pages serves the commit that triggered the release.

## Environment-limited checks

The repository does not currently include browser automation dependencies, and the current execution environment does not have the Ruby `bundle`/`jekyll` executables available. The dependency-free engine/NOVA audit is therefore the authoritative local check; run a Jekyll build and a real browser journey in CI or a developer environment with Ruby/Jekyll and Playwright installed.
