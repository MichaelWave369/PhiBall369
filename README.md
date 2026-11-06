# ΦBALL 369

**Browser-first React pinball physics engine and two-level table workshop.**

### Mission Workshop: visual quest and bonus-mode designer

The workshop now offers **Table Parts** and **Quests & Modes** tabs. Create up to eight objectives, choose targets, bumper hits or upper-deck arrivals, and configure your own timed bonus mode with a multiplier, duration and activation rule. Save and test locally, then export the table as JSON with the quests and mode intact. See [Mission Workshop notes](docs/MISSION_WORKSHOP.md).

### Signature Machines: unique physics layouts and timed mission modes

PhiBall Lab, System Breach and ARCLight 3333 now have independent real collision layouts, new original playfield markings and distinct timed special modes. Earn Quantum Combo, Security Breach or Reactor Overdrive through real hits and ramp ascents. React shows charging progress and active countdowns, and game events apply the bonus points. See [Signature Machines](docs/SIGNATURE_MACHINES.md).

### Sound + Light Rung: responsive arcade personality

An opt-in Web Audio engine generates original synthesized flipper, bumper, slingshot, target, ramp, skill-shot, quest, tilt, and drain effects. Three per-table sound profiles and live-reactive playfield lighting add character without relying on copyrighted samples or requiring new physics. Audio begins disabled until **Enable Arcade Audio** is clicked. See [Sound + Light notes](docs/SOUND_AND_LIGHT.md).

### Elevation Rung: curved 2.5D guided ramps

Ramps now have a continuous cubic Bézier X/Y/Z path with grade-sensitive motion, on-ramp ball travel, rollover/rollback, and tangent-aligned reentry into the destination Planck deck. The React workshop includes a curvature slider for creating and shaping ramps, and the physics overlay exposes live elevation. [Technical details and limitations](docs/ELEVATION_RUNG.md).

### Chrome Edition: physics and visual upgrade

The next rung adds open outlane drains, stalled-ball recovery, Planck polygon slingshots, stronger bumper kicks, original chrome SVG part sprites, and a switchable physics debug overlay. The physics and renderer share [collision geometry](src/geometry.js) so visual rails agree with real solver shapes. For the detailed design, limitations, asset sourcing, and manual test plan, see [Chrome Edition](docs/CHROME_EDITION.md).


PhiBall369 starts as a playable desktop/mobile browser pinball game. No VR stack is required. This is the first rung of a larger open-source table engine.

## Play it locally

Requires Node.js 20.19+ or 22.12+.

~~~bash
npm install
npm run dev
~~~

Open the local URL shown by Vite. For production deployment:

~~~bash
npm run build
npm run preview
~~~

Upload the generated **dist/** directory to Netlify or another static host. The output requires no server.

## Controls

- **A / Left Arrow:** left flipper (hold)
- **D / Right Arrow:** right flipper (hold)
- **Space (hold and release):** charge the spring plunger, release to launch; medium power sweet spot awards a skill shot
- **N:** nudge the table; repeated nudges cause TILT, disabling scoring and flippers until the ball drains
- **On-screen controls:** hold/release plunger, flippers and nudge with touch or mouse

Press **Enter Build Mode** to edit a table. Switch between lower (L1) and upper (L2) playfields. Place pop bumpers, targets, rails (two clicks), or a layer-changing ramp (entrance click, destination click on the other layer). Erase, undo, import and export table JSON. Edits are saved to your browser's local storage.

## Architecture

- **Planck.js (MIT)**, a Box2D-based 2D rigid-body simulator, handles ball-wall, bumper and motorized flipper contacts.
- **Fixed 120 Hz step** with frame accumulator improves simulation consistency across displays.
- **Two independent physics layers** let ramps move the ball from a lower field to an upper field and back. Layer transitions are discrete and **not yet continuous 3D ramp physics**. Full height-field/ramp geometry is a future milestone.
- **Data-driven JSON** defines table parts and quests. Import sanitizes object counts, positions, labels, types, quest goals, and layer transitions.
- **Three original presets:** PhiBall Lab, Break the Matrix: System Breach, and ARCLight 3333. Project themes are first-party inspirations; no commercial table assets are included.
- **No accounts / backend:** all table edits remain local unless manually exported.

## Test and checks

~~~bash
npm test
npm run build
~~~

The GitHub Actions CI workflow runs both commands.

## Roadmap

1. **Rung 1:** playable physics, motorized flippers, two elevation worlds, builder, quests and JSON export.
2. **Rung 2:** proper plunger spring and skill shot; flipper tuning; contact and spin calibration; tilt rules; better upper deck paths; audio and higher fidelity cabinets.
3. **Rung 3:** editable geometric ramps with slope, z-height, inclines, crossings, and multiball; versioned table file format.
4. **Rung 4:** scripting and mission editor; table packs for more Phi369 projects; audio tracks; replays and high scores.
5. **Rung 5:** heritage workshop for legally cleared originals/public-domain/licensed restorations; optional VR/physical cabinet interface.

## Rights

See [CLASSIC_TABLES.md](docs/CLASSIC_TABLES.md). **No third-party branded designs, copied artwork, music, or logos should be added without confirming rights.** Physical concepts and unprotected gameplay ideas are different from expressive assets and commercial trademarks.

Licensed under MIT, with original table art and branding attributed to their creators.
