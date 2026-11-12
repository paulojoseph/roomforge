# Roadmap

Five milestones. M1 is shipped. The others are written as plans: what to change, in what order, and how we will know
it is done. Dates are not promises.

## M1: usable editor (done, v0.1 to v0.4)

- Plan model, validator, undo history, plan file with a JSON Schema.
- 2D editor on SVG: walls, doors, windows, snapping, pan and zoom, selection, handles.
- 3D view next to the drawing, WebGPU with a WebGL fallback and a label for the active renderer.
- Room list with areas, open and save as a file.
- CLI: `inspect`, `check`, `export --glb`.
- Twelve fixtures with hard cases, a golden file for `apartment-2br`, pinned output for three plans.

## M2: room detection from the wall graph, for any plan

Today `find_rooms` follows walls corner to corner and keeps a loop when every corner joins exactly two walls. Plans
in the wild have walls that end in the middle of another wall, walls that cross, rooms inside rooms and walls that
share a corner with a dead end. M2 makes the rooms come out right for all of those.

Plan:

1. Build a planar graph from the walls. Split every wall at the points where it touches or crosses another wall, so
   that each edge runs from vertex to vertex. Vertices are integer millimetres (ADR 0002); intersection points are
   rounded once and the rounded point is the one every edge shares.
2. Drop edges that cannot be part of a closed face (dead ends), repeatedly, until none are left.
3. Find the faces of what remains by walking half-edges in a fixed order. The unbounded face is not a room.
4. Faces inside other faces become holes of the outer face. A room has one outer boundary and zero or more holes.
5. Compute areas with one function that works on the polygon with its holes and does not depend on the direction the
   walls were drawn. A clockwise wall must give the same area as a counter clockwise one.
6. Decide the two area definitions: the room list in the sidebar (centre line today) and `inspect` (inner face today).
   Either make one of them the only definition or keep both, name them in the UI and in the CLI output, and document
   where each is used.
7. Keep room ids stable for plans that already work: `room-01`, `room-02`, ... in the order of the first wall.

Done when: the twelve fixtures give the rooms a person would draw by hand on each one (count and areas written down
in the test), `fixtures/golden/apartment-2br.rooms.json` is checked room by room, the 500 wall plan is no slower than
today (about 10 ms on a laptop, see M5), and `rooms.test.ts` has tests for every shape above, not only rectangles.

## M3: wall corners that join cleanly, openings cut through the wall

Today a wall is one box. At a corner the boxes overlap and stick out, and an opening is a dark rectangle drawn on the
face. M3 makes the wall a proper solid.

Plan:

1. In `src/core/`, compute the footprint of every wall with mitred joins: at each vertex where walls meet, the
   outlines are cut at the bisector. T junctions cut the through-wall at the abutting wall's faces.
2. Turn a footprint into triangles (an extruded polygon with a top, a bottom and sides). Keep the output as plain
   arrays (ADR 0001).
3. Cut each opening out of the wall solid: split the side faces and the top face around the opening, add the reveal
   faces (the four inner faces of the hole). Doors go to the floor, windows start at their sill.
4. Replace the dark rectangles in `Viewer3D.tsx` with the cut geometry.
5. Keep the plan file as it is. No new fields, no changes to ids.

Done when: a closed room has no overlapping or protruding geometry at any corner (checked by volume: the sum of wall
volumes equals footprint area times height), an opening shows the room behind it, and the geometry tests cover a
corner, a T junction, an angled corner and a wall with two openings.

## M4: glTF export of that geometry

Today the exporter writes one box per wall and ignores openings. M4 exports what M3 builds.

Plan:

1. Feed the M3 geometry to `export-glb.ts`. One node per wall is fine; share vertices inside a wall.
2. Keep the output deterministic: same plan, same bytes.
3. Extend `glb-check.ts` so it covers everything the exporter can get wrong: accessor min and max match the data,
   normals are unit length, triangle winding is consistent, index types fit the vertex count.
4. Run the file through an independent validator in the test run, or say plainly in the README which checks exist.
5. Pin the new output in `test/stable-output.test.ts` as a deliberate, reviewed change.

Done when: `export` writes a file that passes the repo's checks, the README says which viewers it was opened in and
which it was not, and the exported volume matches the core geometry.

## M5: a 3D view that stays fast on the 500 wall plan

The view builds one mesh per wall and builds all of them again on every edit. With `office-500` that is 500 meshes
and 500 draw calls.

Plan:

1. Measure first and write the numbers down. What can be measured without a GPU: CPU time to build the geometry
   for 500 walls in Node (about 2 ms with the core in its current form), number of meshes and draw calls the view
   creates, bytes uploaded after one edit, time spent in React between the edit and the first draw.
2. Merge walls that share a material into a single mesh. One draw call for all walls, one for all openings.
3. On an edit, rebuild only the walls that changed and update the buffers in place. Keep a map from wall id to its
   range in the buffer.
4. Move geometry building to a web worker (the core already runs there, ADR 0001) if the numbers say it is needed.
5. Put the measured numbers in the README, with the machine they were measured on. Frame rate on a real GPU needs a
   real GPU: say which device and browser, or do not quote it.

Targets for the 500 wall plan: at most 10 draw calls, rebuild after moving one wall under 1 ms of CPU, first load
under 50 ms of geometry time. These are targets, not results.
