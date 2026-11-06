# ΦBALL 369

**Browser-first pinball physics engine and two-level table workshop.**

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
