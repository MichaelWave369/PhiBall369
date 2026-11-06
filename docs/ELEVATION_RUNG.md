# PhiBall369 · Elevation Rung

## What changed

The former "ramp" effect instantly destroyed the ball on one deck and respawned it on the other. This rung builds a **continuous sampled cubic Bézier guide track** in three coordinates, so the ball actually travels through the connector rather than disappearing for the entire transition.

The renderer draws elevated chrome rails, glass lane beds, supporting posts, endpoint lamps, and the moving ball projected above its shadow. The debug overlay shows ramp height (Z), track completion, and travel speed.

## Honest simulation scope

This is **2.5D guided-ramp physics**, not a full free-moving 3D rigid-body simulator.

- The lower and upper decks continue to use separate Planck.js 2D worlds with genuine hinged flippers, bumps and rigid-body collisions.
- While inside a ramp, the ball temporarily leaves the 2D world and travels along a 3D spline's centerline in fixed 1/120-second simulation increments.
- Tangential acceleration projects the table gravity and vertical grade onto the track tangent and adds rolling drag. The entrance gets a small mechanical "ramp assist" to make normal flipper shots practical; the game can roll back if it loses too much speed.
- On finishing, the ball reenters the proper deck with tangent-aligned velocity. When rolling back, it returns to its source deck without scoring a ramp quest.
- Side-rail collisions, flying off ramps, real rigid-body ball spin, true 3D ramp intersections, and physically calibrated slopes are *not* implemented. These should be tackled in a future 3D physics rung.

## Backward compatibility

The existing table JSON fields \`x/y/toX/toY/layer/toLayer/r\` remain valid. Import adds an optional \`curve\` parameter clamped to -1.5..1.5; older saved tables default to 0.4. Existing presets receive custom curvature. No unsafe script code is accepted.

## Table builder

1. Enter Build Mode and select **Curved ramp (two clicks)**.
2. Adjust the **Ramp Curvature** slider for the desired left/right bend. Negative and positive bends curve to opposite sides.
3. Click an entrance on the source deck.
4. Click an exit on the destination deck.
5. Choose **Shape existing ramp**, click that ramp's entrance, then adjust its curvature to reshape a saved track.
6. Exit the workshop and play it. A valid upward ramp awards a quest only after successful arrival on the second deck.

These tracks are composable within existing presets, local saves and JSON export.

## Verification

\`npm test\` checks monotonic height, geometric continuity, curved paths, rollback, score eligibility, legacy import and reset safety. \`npm run build\` checks the Vite React bundle. Manual playtesting should still verify ramp approaches, flipper feel, render alignment at both ends, and behavior on slower devices.
