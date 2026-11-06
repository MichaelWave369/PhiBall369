# PhiBall369 Live React Arcade

PhiBall369 now has a React 19 shell with live HUD, machine selection, scoring, missions, touch controls and two-level table editor. It reuses the original Planck.js / Box2D 2D rigid-body pinball engine rather than replacing it.

## Local run

Requires Node.js 20.19+ or 22.12+.

    npm install
    npm test
    npm run dev

Run `npm run build` to generate `dist/`.

## Architecture

- `src/App.jsx`: React components, controls, game lifecycle, stateful builder, persistence and JSON import/export.
- `src/render.js`: responsive canvas drawing.
- `src/main.jsx`: React root.
- `src/physics.js`: independent Planck worlds, hinged flippers, scoring, quests, two-level transitions.
- `src/tables.js` and `src/validation.js`: presets and import policy.

Canvas updates via requestAnimationFrame, while the React HUD updates at about 8Hz. The physics engine uses fixed simulation steps at 120Hz.

## Live GitHub Pages site

1. Merge the React PR after passing CI.
2. In repository **Settings > Pages**, select **GitHub Actions** as the publishing source.
3. Open **Actions > Publish React Arcade to GitHub Pages** to see the status, or trigger **Run workflow**. Subsequent main-branch commits will publish automatically.
4. Once deployment is successful, open the URL shown by the environment. Expected GitHub Pages location is `https://michaelwave369.github.io/PhiBall369/`.

The GitHub Pages setting is not automatically enabled by a normal GITHUB_TOKEN.

Static Netlify deployment also works: publish the generated `dist/` folder.

## Scope and limitations

Rung 2 is still a 2D pinball simulation with two discrete physics layers. Continuous 3D slopes, detailed spin calibration, multiball and high-fidelity audio are separate future improvements.
