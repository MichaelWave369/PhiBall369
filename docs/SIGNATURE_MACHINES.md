# PhiBall369 Rung 7: Signature Machines

The three initial machines no longer share a near-identical playfield. Their **actual Planck collision parts, target placements and spline ramp entrances** are different, and each includes an original, timed gameplay mode.

## The machines

| Machine | Physical identity | Mode | Activation | Active bonus |
| --- | --- | --- | --- | --- |
| PhiBall Lab | Triangular bumper cluster, symmetric targets | Quantum Combo | 5 bumper hits | 12 seconds of 2× bumper points |
| System Breach (BTM) | Asymmetric security-node grid and four sentries | Security Breach | 3 target hits | 15 seconds of 3× target points |
| ARCLight 3333 | Reactor diamond, four navigation beacons, starboard ascent | Reactor Overdrive | 2 successful upper-deck ascents | 18 seconds of 3× bumper points |

Each mode is **earned through actual game events**. Existing quest bonuses remain independent. Mode bonus math uses the underlying base points (100 per bumper, 500 per target, 1200 per upper arrival). An activation event itself is not retroactively multiplied.

When time expires, the same mode can be recharged. If the ball drains, the active mode ends. Physics pause also pauses the timer because it uses simulated game time, not wall-clock time.

## React and Canvas changes

The score panel now displays the current machine's signature mode, progress to activation, remaining seconds, multiplier and activation count. Its lamp bar and playfield rim illuminate during the active mode. Original screen-printed table graphics distinguish a laboratory, a security grid, and a starship reactor, without adding invisible collision bodies.

All mechanical parts still use the same schema and builder. Custom tables retain an optional, validated \`mode\` metadata block when saved/imported. The workshop does not yet provide a full mode editor; imported JSON can define the bounded mode configuration.

## Compatibility and boundaries

- The canonical Lab machine keeps legacy part IDs used by existing tests.
- Shared shooter lane, slingshots, flippers and drains stay in place.
- Tables still use independent Planck deck worlds and guided 2.5D spline ramps, not unconstrained 3D rigid-body physics.
- Mode data is **declarative** and cannot execute JavaScript from table JSON.
- This rung changes original Phi369 table designs only, not copyrighted branded machine art or recordings.

## Run checks

    npm test
    npm run build

Test physics with the React arcade in a browser: confirm score, ramp arrival, timer progress, sound effects, ball drains, editor changes, and save/import/export for each machine. The CI checks cover stable geometry, old table support, bonus math, expiry and saved mode schema; they cannot substitute for hands-on pinball tuning.
