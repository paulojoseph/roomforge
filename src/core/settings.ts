// Tunable numbers live here and only here. Lengths are millimetres unless
// the name says otherwise.

export const settings = {
  wall: {
    defaultThickness: 150,
    defaultHeight: 2700,
    minThickness: 40,
    maxThickness: 600,
    minHeight: 1000,
    maxHeight: 6000,
  },
  opening: {
    minWidth: 300,
    maxWidth: 4000,
    minHeight: 400,
    maxHeight: 3000,
    maxSill: 2000,
    door: { width: 900, height: 2100, sill: 0 },
    window: { width: 1200, height: 1200, sill: 900 },
  },
  snap: {
    gridMm: 100,
    // endpoint snap radius, mm
    endpointRadiusMm: 100,
    angleStepDeg: 15,
    // how far the cursor may be from a wall end to pick it, screen pixels
    pickRadiusPx: 15,
  },
  view: {
    // scale of the 2D view at zoom 1: one pixel is ten millimetres
    pxPerMmAtZoom1: 0.1,
    minZoom: 0.1,
    maxZoom: 16,
  },
  join: {
    // two wall ends closer than this (but not equal) are reported as a gap
    gapMm: 50,
  },
  rooms: {
    // walls thinner than this are drawn as lines and are not inset
    thinWallMm: 60,
  },
  history: {
    limit: 200,
  },
  advice: {
    // narrowest door worth drawing, mm
    minDoorWidth: 800,
    // an opening closer than this to the end of its wall has no room for a frame, mm
    minEdge: 100,
    minSill: 300,
    shortWall: 300,
    // rooms under this area get a hint, mm2 (4 m2)
    smallRoomMm2: 4_000_000,
    // a wall longer than longThinWall and not thicker than thinWall gets a hint, mm
    longThinWall: 8000,
    thinWall: 100,
  },
  drawing: {
    // SVG export: output pixels per millimetre and the empty border around the plan, mm
    pxPerMm: 0.1,
    marginMm: 600,
    // distance between a wall face and its dimension line, mm
    dimensionGapMm: 300,
    // margin kept free when zooming to fit, screen pixels
    fitMarginPx: 24,
    // how far from the centre of an opening a click still picks it, mm
    openingPickMm: 150,
  },
} as const;

export type Settings = typeof settings;
