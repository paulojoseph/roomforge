# 0001. `src/core/` has no UI dependencies

Status: accepted

## Context

The plan model, the validator, room detection, wall geometry and the exporters are needed in three places:

- the browser, where the editor runs;
- a web worker, so heavy work (room detection on big plans, export) does not block the 2D view;
- Node, for `bin/roomforge.mjs`, so the same checks can run in a terminal or in CI.

three.js, React and Next.js all assume a browser or a bundler. Importing any of them from the model code would make
the CLI pull in a renderer and would make the worker bundle depend on React.

## Decision

Nothing under `src/core/` imports `three`, `react`, `next` or anything that touches `window` or `document`.
Geometry leaves the core as plain arrays of numbers (`{ positions, normals, indices }`). The 3D view turns those into
`BufferGeometry` on its side.

## Consequences

- The CLI is a thin script that is bundled with esbuild into one file, no framework in it.
- Geometry code cannot use `Vector3`, `Matrix4` and friends. Small helpers live in `geometry.ts` instead.
- Tests run in the plain Node environment of Vitest, no jsdom, no GPU.
- The 3D view copies the arrays into typed arrays when it builds a mesh. This is cheap compared to the draw cost.
