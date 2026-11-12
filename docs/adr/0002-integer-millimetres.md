# 0002. Lengths are integer millimetres

Status: accepted

## Context

Floor plans mix big numbers (a hall of 20 m) with small ones (a wall of 40 mm, a door 50 mm from a corner).
With floating point metres, two wall ends that were typed as "the same point" can end up a few ulps apart, and the
check "do these walls meet" turns into a tolerance. It also makes the saved file differ between machines.

## Decision

Every length in the plan file and in `src/core/` is an integer number of millimetres: coordinates, thickness, height,
opening offset, width and sill. Areas are integer square millimetres where they are stored. Metres appear only when
text is shown (`format.ts`) and when geometry is handed to a 3D format (`walls-geometry.ts`, the exporters).
`meta.units` only chooses how lengths are displayed.

## Consequences

- Points can be compared with `===`. Room detection relies on it.
- The editor rounds every point it creates.
- Diagonal walls (30 or 45 degrees) have endpoints rounded to the nearest millimetre, so their angle is only
  approximately what was drawn.
- Output that depends on the plan (the `inspect` text, the exported file) is the same on every machine.
