# Original PhiBall369 chrome sprite assets

These SVG sprites were created for PhiBall369 as original source assets. They are part of the MIT-licensed repository, not copied or adapted from a commercial pinball table.

- ball.svg: polished steel ball
- bumper.svg: reflective pop-bumper cap and lamp ring
- flipper-red.svg / flipper-blue.svg: rubber and chrome hinged flippers
- target.svg: ruby/metal standing target
- slingshot.svg: triangular chrome/plastic kicker, mirrored for right side
- ramp-gate.svg: illuminated upper/lower transfer ring

Each asset is a self-contained scalable SVG without linked fonts, scripts or external images. Vite imports them as file URLs, and the canvas renderer caches each image after first use. Future themes can replace the assets while preserving the engine collision geometry.
