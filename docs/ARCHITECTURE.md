# Architecture

roomforge has three parts that share one model.

```
  src/core/            plain TypeScript: model, validator, rooms, geometry, exporters
     ^        ^
     |        |
  src/app/    bin/roomforge.mjs
  src/features/   (CLI, bundled into dist/)
  (Next.js app)
```

## Layers

`src/core/` knows nothing about the browser or any framework (ADR 0001). Everything else depends on it, never the
other way round. The app imports from `@/core/...`, the CLI imports `src/core/index.ts` and is bundled by esbuild.

## Directory map

```
bin/roomforge.mjs      CLI entry, bundled to dist/roomforge.mjs
docs/                  this file, the roadmap, ADRs in docs/adr/
fixtures/plans/        the twelve plans written by the fixture script
fixtures/golden/       expected room areas for apartment-2br
public/plans/          plans the app can open from the Examples menu
schemas/               JSON Schema of the plan file
scripts/               fixture script, example sync, clean.sh
src/app/               Next.js App Router: layout, page, styles
src/core/              the model and everything that does not need a browser
src/features/editor/   2D editor, toolbar, sidebar, store, file open and save
src/features/viewer/   3D view and the choice of renderer
test/                  Vitest, node environment
```

## The plan

A plan is `{ meta, walls, openings }`. All lengths are integer millimetres (ADR 0002).

- A wall has an id, a start and end point, a thickness and a height. Its centre line runs from start to end.
- An opening belongs to a wall by id. `offset` is the distance from `wall.start` to the near edge of the opening,
  `width` runs forward from there. `sill` is the height of the bottom edge above the floor.
- Ids look like `w-001` and `o-001`. They are assigned once and never change; a saved plan can be edited by hand
  and other files may refer to them.

The model functions (`addWall`, `removeWall`, `addOpening`, ...) are pure: they return a new plan.
`history.ts` keeps snapshots of the plan for undo and redo. Snapshots share structure, so 200 steps are cheap.

## Validator

`validate.ts` returns a list of problems, each with a code and one line of text. The CLI prints the lines and then
`Validation: no problems found.` or `Validation: N problems found.`. The limits it checks come from `settings.ts`.
What it looks at: duplicate ids, zero length walls, thickness and height limits, whole-millimetre values, openings
that stick out of their wall, overlap, openings that are too tall for the wall, and wall ends that are close to each
other without being the same point.

## Rooms and areas

`rooms.ts` walks the walls from corner to corner and returns the closed loops it finds as rooms. Each room carries its
centre line polygon, the ids of its walls, a perimeter and an area.

There are two areas:

- `room.area` is measured to the wall centre line. The sidebar shows it.
- `area_inner()` moves every edge inwards by half the thickness of its wall and measures what is left. `inspect`
  prints this one.

For a 5 x 4 m room with 100 mm walls the two numbers are 20.00 and 19.11 square metres.

## Helpers around the model

Small modules in `src/core/` that sit on top of the model and each do one job. Every one is pure and returns a new
plan or a plain value.

- `units.ts` reads what a person types in a length field (`3.5m`, `12'6"`) and formats feet and inches.
- `bounds.ts` has boxes, the extent of a plan with wall thickness, and the zoom that fits a box in a viewport.
- `stats.ts` adds up wall length, wall surface, volume and opening area. `report.ts` writes them as Markdown.
- `transform.ts` translates, rotates, mirrors and scales a whole plan.
- `edit.ts` splits, merges, flips and moves walls and openings, keeping the openings on their walls.
- `clipboard.ts` copies walls with their openings and pastes them with new ids.
- `query.ts` answers what is under a point, which centre lines cross, which walls touch, which ends are loose.
- `diff.ts` compares two plans by id. `migrate.ts` reads the older 0.1 and 0.2 files. `renumber.ts` closes id gaps.
- `dimensions.ts` places dimension lines. `export-svg.ts` and `export-csv.ts` write the drawing and the schedules.
- `templates.ts` draws rectangular and L shaped rooms. `advise.ts` gives soft hints that never block anything.

The numbers these modules use are in `settings.ts` (`advice`, `drawing`).

## Wall geometry

`walls-geometry.ts` turns a wall into a closed box: 24 vertices, 12 triangles, as plain arrays. Plan (x, y) in
millimetres becomes world (x, height, -y) in metres, so the plan seen from above matches the 2D drawing.
`openings.ts` has the helpers for where an opening sits on its wall and a flat rectangle for each face of the wall.

## 2D editor

`Editor2D.tsx` draws on a `<canvas>` element with the 2D context. Every change to the plan or the view schedules a
redraw with `requestAnimationFrame`; the whole drawing is repainted from scratch each time: grid, rooms, walls,
openings, handles, text. Hit testing for selection does not look at the shapes. Each wall is also drawn into a hidden
second canvas in a unique colour and the colour under the cursor says which wall was hit. Pan and zoom change the
transform of the context. Snapping is done in screen pixels before the point is converted to plan coordinates.

## Snapping

`snap(point, plan, options)` returns the point to use and which mode produced it. There are three modes: grid
(100 mm), endpoint (the end of an existing wall within 150 mm of the cursor) and angle (the segment being drawn is
kept on a multiple of 15 degrees). The editor asks for endpoint first, then angle, then grid.
The radius and the step are in `settings.ts` under `snap`.

## State

The editor state (plan, tool, selection) lives in a React context with `useReducer`. Actions are plain objects such
as `{ type: 'addWall', start, end }`. The reducer calls the model functions and pushes the result to the history.
The sidebar and the 3D view read from the same context, so a change in the 2D view re-renders them as well.
The view (zoom and pan) is kept in a ref and is not part of the history.

## 3D view

`Viewer3D.tsx` uses React Three Fiber. For each wall it asks the core for the box and builds one `BufferGeometry`
and one mesh. Doors and windows are flat dark rectangles placed in front of both faces of the wall at the opening.
When the plan changes, the meshes are built again.

The renderer is chosen once: if `navigator.gpu` gives an adapter the three.js WebGPU renderer is used, otherwise the
WebGL renderer. A label in the corner of the view shows which one is active.

## Export

The file menu offers glTF and OBJ. `export-glb.ts` writes one node and one mesh per wall into a binary glTF 2.0
file, `export-obj.ts` writes Wavefront OBJ. Both are deterministic: the same plan gives the same bytes.
`glb-check.ts` has structural checks for the glTF file (header, chunk sizes, accessor ranges, index bounds).

## Files

The plan is autosaved to `localStorage` every five seconds and restored when the page is opened again.
"Open" and "Save" exchange `.json` files with the disk; the saved text is the one `serializePlan` writes, one wall and
one opening per line, so it diffs well. Opening a file replaces the current plan and clears the undo history.

## CLI

`bin/roomforge.mjs` has three commands, `inspect`, `check` and `export`. `npm run build:cli` bundles it with esbuild
into `dist/roomforge.mjs`. Exit codes: 0 fine, 1 the validator found problems, 2 bad arguments or an unreadable file.

## Determinism

The same plan gives byte for byte the same `inspect` text and the same exported file on every run and machine.
The code avoids anything that depends on the platform: no `Date`, no random ids, no locale formatting, no iteration
over unordered sets when writing output. Floats are only used inside a calculation and are rounded before they are
printed. `test/stable-output.test.ts` is the guard for this.

## Fixtures and tests

`scripts/generate-fixtures.mjs` writes the twelve plans in `fixtures/plans/` and does not import anything from
`src/`. `npm run fixtures:check` compares the files on disk with what the script would write.
Tests are in `test/`, named after the file they cover. `test/stable-output.test.ts` pins the sha256 of the `inspect`
text and of the exported file for three fixtures.

## Build

`npm run build` is a normal Next.js production build and needs no network. Fonts are the system fonts, there are no
remote images and no analytics. The npm scripts set `NEXT_TELEMETRY_DISABLED=1`.
