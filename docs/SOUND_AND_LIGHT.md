# PhiBall369 Sound + Light Rung

The first-party audio engine is **fully procedural**. It uses Web Audio OscillatorNode and GainNode envelopes, not copied recordings or copyright-protected songs. Mechanical clicks, bumper pops, slingshots, scoring, tilt, and ramps have separate short synthesized effects. The three original machines use distinct pitch registers for their sound identities.

## Browser rules

Modern browsers block autoplay until a user gesture. Audio therefore starts **off**. Press **Enable Arcade Audio** to explicitly create/resume the AudioContext. The engine does not activate AudioContext when the page loads. If audio isn't supported, the game continues silently.

Volume, mute, and theme are independent from the physics engine. Sounds are short, capped, and debounced to avoid harsh overlapping tones on high-speed collision loops. No audio files or third-party sound libraries are downloaded.

## Visual identity

The renderer's original inserts respond to live collision events with short light pulses. Each preset has distinct playfield text and accent color, while geometry remains unchanged. Lighting is purely decorative and does not alter physics or collision coordinates.

## Architecture

- \`src/audio.js\`: testable event-to-synthesis plan and opt-in WebAudio playback.
- \`src/physics.js\`: emits structured nonvisual game cues in addition to its existing mission announcements.
- \`src/App.jsx\`: explicit audio enable/mute/volume controls and flipper button/key effects.
- \`src/render.js\`: hit-reactive insert lights and per-machine playfield branding.

## Test plan

Run \`npm test\` and \`npm run build\`, then test on desktop and mobile:

- The page must remain silent before the Enable Audio button is clicked.
- Click Enable Audio; test volume slider, mute switch, theme changes.
- Hold/release plunger and strike bumpers, targets, and slings; check effects.
- Trigger a ramp, quest, tilt, and drain; verify corresponding sounds.
- Rapid collisions must not make excessive overlapping voices.
- Confirm original table physics and JSON import/export have not changed.

This rung is not high-fidelity sample-based physical cabinet recording and not original background music. Those can be optional future packs with verified licensing.
