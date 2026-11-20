# roomforge

A floor plan editor that runs in the browser. Draw walls in 2D, drop doors and windows on them, and watch the result
come up in 3D next to the drawing. roomforge tells you the area of every room and exports the model.

People planning a renovation, small architecture offices and furniture shops need a tool like this, and the good
ones are closed and paid. roomforge is MIT licensed and has no accounts, no backend and no tracking.

Version 0.4.2, MIT license.

## What you get

- A 2D editor drawn in SVG: walls, doors, windows, snapping to the grid and to wall ends, pan and zoom, undo and redo.
- A 3D view next to it that follows every edit. It uses the three.js WebGPU renderer when the browser has WebGPU and
  falls back to WebGL when it does not. A small label in the corner says which one is running.
- A room list with the area of each room.
- Open and save plans as plain JSON files.
- Export the drawing as SVG, with room areas and dimension lines, and the room schedule as CSV.
- Quantities in the sidebar (wall length and surface, doors and windows) and a few hints, for example a door
  narrower than 800 mm.
- A command line tool with the same logic, so a plan can be checked in a terminal or in CI.
- Export to binary glTF.

## Quick start

You need Node 20 or newer.

```
npm ci
npm run dev
```

Open the address that `next dev` prints. Pick "Examples" in the toolbar to load a plan, or press `W` and start
drawing. Production build:

```
npm run build
npm start
```

The build does not need network access. Fonts are the system fonts, there are no remote images, nothing is sent
anywhere.

## Using the editor

| Key | Tool |
| --- | --- |
| `V` | Select. Click a wall or an opening, drag the round handles to move a wall end, arrow keys nudge. |
| `W` | Wall. Click to start, click to continue. Shift keeps the wall straight. Double click or `Esc` to stop. |
| `D` | Door. Click on a wall. |
| `N` | Window. Click on a wall. |
| `H` | Pan. Space or the middle button also pans. The wheel zooms. |
| `L` | Show the length of every wall. |
| `Delete` | Remove the selection. |
| `Ctrl+Z`, `Ctrl+Shift+Z` | Undo, redo. |

Plans live in a file that you open and save. There is no autosave and nothing is kept on a server: if you close the
tab without saving, the plan is gone. "Save" downloads `<plan name>.json`, "Open" reads one back.

The room list in the sidebar measures each room to the centre line of its walls.

## Command line

```
npm run build:cli
node dist/roomforge.mjs inspect fixtures/plans/apartment-2br.json
node dist/roomforge.mjs check fixtures/plans/apartment-2br.json
node dist/roomforge.mjs export fixtures/plans/studio-30.json --glb out/studio-30.glb
node dist/roomforge.mjs export fixtures/plans/apartment-2br.json --svg out/apartment-2br.svg
node dist/roomforge.mjs export fixtures/plans/apartment-2br.json --csv out/rooms.csv
```

`inspect` prints a table of rooms with area and perimeter, the wall and opening counts and the total area. Areas
are measured to the inner face of the walls, perimeters along the centre line:

```
plan: apartment-2br
walls: 20  openings: 10  rooms: 5

room     area m2   perimeter m  walls  openings
-------  --------  -----------  -----  --------
room-01  19.11     18.000       4      2
room-02  11.31     14.000       4      2
room-03  13.26     15.000       4      2
room-04  10.54     13.400       4      2
room-05  4.32      8.400        4      2

total area: 58.54 m2 (inner face)
```

`check` runs the validator. It prints one line per problem and ends with exactly `Validation: no problems found.` or
`Validation: N problems found.`. The exit code is 0 when the plan is clean and 1 otherwise.

`export` writes a binary glTF file. The same plan gives the same bytes every time, on every machine.
`--svg` writes a drawing and `--csv` the room schedule with both area definitions side by side.

## The plan file

A plan is JSON with `walls`, `openings` and `meta`. Every length is an integer number of millimetres.

```json
{
  "meta": {"name": "studio-30", "units": "mm"},
  "walls": [
    {"id": "w-001", "start": {"x": 0, "y": 0}, "end": {"x": 6000, "y": 0}, "thickness": 150, "height": 2700}
  ],
  "openings": [
    {"id": "o-001", "wallId": "w-001", "kind": "door", "offset": 1000, "width": 900, "height": 2100, "sill": 0}
  ]
}
```

`offset` is the distance from the start of the wall to the near edge of the opening. `meta.units` only chooses how
lengths are shown. The JSON Schema is in `schemas/plan.schema.json`. Wall and opening ids never change once a plan is
saved.

## How it is built

```
            +---------------------------+
            |        src/core/          |
            |  model  validator  rooms  |
            |  geometry  snap  export   |
            +-------------+-------------+
                          |
          +---------------+----------------+
          |                                |
  +-------+---------+             +--------+---------+
  | src/app/        |             | bin/roomforge    |
  | src/features/   |             |   inspect        |
  | Next.js, SVG 2D |             |   check          |
  | R3F 3D, sidebar |             |   export         |
  +-----------------+             +------------------+
```

`src/core/` is plain TypeScript. It does not import three, react or next, so it runs in the browser, in a worker and
in Node. The app and the CLI are thin layers on top. More in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Stack: Next.js 15 (App Router), React 19, TypeScript in strict mode, three.js with React Three Fiber, zustand,
Tailwind, Vitest.

## What works now

The twelve plans in `fixtures/plans/` cover the awkward cases. They are written by `scripts/generate-fixtures.mjs`
and `npm run fixtures:check` confirms the files on disk are what the script writes. For each one, this is what the
tools do today:

| Fixture | What it is | Walls | Openings | Validates | Rooms found | glTF |
| --- | --- | ---: | ---: | :---: | ---: | :---: |
| `studio-30` | One rectangular room, door and two windows | 4 | 3 | yes | 1 | yes |
| `apartment-2br` | Five rooms, drawn one by one | 20 | 10 | yes | 5 | yes |
| `l-room` | L shaped room | 6 | 3 | yes | 1 | yes |
| `room-cw` | Rectangle with the walls drawn clockwise | 4 | 2 | yes | 1 | yes |
| `two-rooms-shared` | Two rooms that share a wall | 7 | 5 | yes | 0 | yes |
| `t-junction` | A wall that ends in the middle of another wall | 5 | 4 | yes | 1 | yes |
| `crossing-walls` | Two walls that cross inside a room | 6 | 4 | yes | 1 | yes |
| `room-in-room` | A closet inside a larger room | 8 | 3 | yes | 2 | yes |
| `open-plan` | Room with a low counter that stops in the middle | 5 | 3 | yes | 0 | yes |
| `angled-walls` | Walls at 30 and 45 degrees | 5 | 3 | yes | 1 | yes |
| `office-500` | 125 small offices, 500 walls | 500 | 125 | yes | 125 | yes |
| `door-corner` | Door 5 cm from a corner | 4 | 2 | yes | 1 | yes |

"Rooms found" is the number of rooms in the sidebar and in `inspect`.

## Tests and checks

```
npm test                 Vitest, node environment, no browser needed
npm run typecheck        tsc --noEmit
npm run lint             ESLint with the Next.js config
npm run fixtures:check   the fixture files match the script that writes them
```

The full test run takes under a minute. `test/stable-output.test.ts` pins the sha256 of the `inspect` text and of the
exported file for three fixtures, so a change in the output never goes unnoticed. Every validator message has a test
for its exact wording.

## Roadmap

The plans are written out in [docs/roadmap.md](docs/roadmap.md).

| Milestone | Goal | State |
| --- | --- | --- |
| M1 | Usable editor: model, validator, 2D, 3D, CLI | done |
| M2 | Room detection from the wall graph, for any plan | planned |
| M3 | Wall corners that join cleanly, openings cut through the wall | planned |
| M4 | glTF export of that geometry | planned |
| M5 | A 3D view that stays fast on the 500 wall plan, with numbers | planned |

## Limits

- One storey per plan. No stairs, no roofs, no furniture.
- Walls are straight segments. Curved walls are not supported.
- Walls are drawn as boxes: corners overlap and doors and windows are painted on the wall, not cut through it.
- Lengths are whole millimetres. Walls at 30 or 45 degrees have their end points rounded.
- No accounts, no backend, no autosave, no translations. The interface is in English.
- The 3D view needs WebGL 2 or WebGPU.

## Scripts that touch files

- `scripts/generate-fixtures.mjs` writes `fixtures/plans/`. Run it with `npm run fixtures`.
- `scripts/sync-examples.mjs` copies three fixtures into `public/plans/` for the Examples menu.
- `scripts/clean.sh` removes exported files between runs: `OUT_DIR=out sh scripts/clean.sh`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. It is short.

## License

MIT, see [LICENSE](LICENSE). Copyright Paulo Marques.
