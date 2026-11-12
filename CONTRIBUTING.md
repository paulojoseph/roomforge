# Contributing

Small project, a few rules.

- `src/core/` never imports `three`, `react` or `next`: it runs in the browser, in a worker and in Node (`docs/adr/0001-core-has-no-ui-dependencies.md`).
- No new runtime dependency without an ADR in `docs/adr/`.
- Lengths are integer millimetres in the plan file and in `src/core/` (`docs/adr/0002-integer-millimetres.md`).
- Fixtures only come from `scripts/generate-fixtures.mjs`. Change the script, run `npm run fixtures`, commit both.
- `test/stable-output.test.ts` is never edited to make a change pass. If that output has to change, talk about it first.
- Wall and opening ids in a saved plan never change.
- Every validator message has a test for its exact text.
- Tests live in `test/` and mirror the file names in `src/core/`.
- Tunable numbers (limits, radii, tolerances) go in `src/core/settings.ts` and nowhere else.
- One file per exporter.
- Before sending a change run `npm test`, `npm run typecheck`, `npm run lint` and `npm run fixtures:check`.
