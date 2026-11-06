# Chrome Edition · Gameplay and art pass

The Chrome Edition keeps all parts physically separate from appearance. Every ball, rail, flipper, target, bumper and triangular slingshot has a solver-side collision representation independent of the rendered SVG sprite.

## Geometry repairs

- \`src/geometry.js\` is the source of truth for the steel guide rails, two permanent mechanical slingshots and drain regions. Render and physics import the same locations.
- Removed the old lower-left and lower-right dead-end wedge rails that could trap balls below flipper reach.
- Left and right outlanes plus the open central drain now explicitly remove a lost ball; a central shooter lane remains accessible when a ball is ready for launch.
- An active ball crawling below the slings in an unplayable corner drains after 1.3 seconds of near-zero speed.
- A plunger misfire that settles at the bottom of the right-side shooter lane resets to the launcher without counting as a lost ball.
- On upper playfields, the existing 18-second recovery chute remains, with a supplemental gentle impulse for very slow, stuck balls.
- The slings use Planck triangular polygon collision bodies, each with 75-point scoring and an upward kick impulse. Bumper impulse has been increased.
- Collision callbacks only queue hits; impulse and scoring processing happens after each fixed time step, outside the locked physics world.

## Sprite pipeline

New, original **chrome SVG sprites** live under \`src/assets/\`:

- ball
- bumper
- flipper (red and cyan versions)
- standing target
- triangular slingshot
- ramp gate

These sprite files were authored specifically for this repository. No third-party images, commercial table scans, or brand assets are embedded.

\`src/sprites.js\` maps logical names to Vite-managed sprite URLs. It lazily caches images and renders them with \`drawImage\` after loading. If a sprite is unavailable, the game continues drawing simple vector primitives. This makes switching to a future CC0 or licensed image pack straightforward without changing the physics.

Optional sources worth evaluating individually:
- [rounddroid 2D pinball sprites](https://opengameart.org/content/2d-pinball-sprites) (listed CC0)
- [Kenney assets](https://kenney.nl/assets), with per-pack licensing and CC0 terms on eligible assets

Review each downloaded file license before redistributing it. The supplied originals require no downloads or licenses beyond the repository license.

## Diagnostics

The right-side workshop adds **Show physics debug overlay**, displaying drain bounds, triangular sling collisions, live ball coordinates, velocity, speed and stuck duration. This mode works both in play and build mode. It is a diagnostic renderer, not an extra physics world.

## Known limitations

The ball and flippers are dynamic 2D Planck bodies; multi-level ramps still act as discrete transfers between two 2D physics scenes. Real 3D slope contact, flipper-rubber calibration, sound design, and full slingshot editor support remain future milestones.

## Validation

Run:

    npm install
    npm test
    npm run build

Manual checks: low-speed plunger misfire, both outlanes, sling rebound, flipper holding and play, upper-deck recovery, editor placement and JSON import/export, and debug overlay alignment on mobile and desktop.
