# Engine Rung 1 design notes

The first version is intentionally a browser-only playable milestone, not a promise of real-world 3D ball trajectory accuracy.

## Simulation

- Coordinate system: world units roughly represent tens of centimeters on a physical table; +Y flows down the projected inclined playfield.
- Each active scene uses Planck rigid-body simulation at 120 Hz, motorized hinged flippers, static rails, solid targets and bumpers. The visual display is projected as 2D top-down.
- Simulated gravity is a planar component of table tilt; this does not yet include detailed ball rotational contact, spin transfer, or 3D height variation.
- Ball is the only object transferred between physics worlds on hitting a ramp entrance trigger. Upper scene timeouts have a recovery chute.
- Events are queued and processed *after* stepping to avoid mutating a locked Box2D world from a contact callback.

## Table JSON

Version 1 fields: id, title, subtitle, accent, objects, quests. Parts are typed bumper, target, wall, ramp. Each part belongs to layer 0 or 1. A ramp has from-layer (layer), toLayer, source x/y, destination toX/toY, and trigger radius. Quests count bumperHits, targetHits or rampRuns.

Import is constrained to at most 120 parts, finite coordinates inside the playable region, and a maximum of eight quests. No custom script execution. Additional content should be migrated through versioned schemas in a later release.

## Future height-field design

Replace the discrete "ramp teleport" with paths defined by splines (x, y, z), physical grade, and collision edges. The ball travels on surfaces and transfers naturally between layers at matching heights. Add 3D solver or a tested height-field coupling rather than simply painting ramp depth. Existing tables can migrate by preserving source and destination nodes.

## Acceptance criteria for rung 1

- Ball launches and can be influenced by two separate hinged flippers.
- Bumper and target contacts award points and progress quest counters.
- Lower/upper level ramp transitions change active physics world.
- Editor places and removes valid parts per layer, undo works, export and import roundtrip.
- Static deployment works from dist/ and test/build runs clean.
