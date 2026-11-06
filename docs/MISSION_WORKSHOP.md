# PhiBall369 Rung 8: Mission Workshop

The browser editor now includes **Table Parts** and **Quests & Modes** tabs.

## Building a machine

1. Select a stock machine and choose **Enter Build Mode**.
2. **Table Parts:** arrange bumpers, targets, rails, curved upper/lower ramps, and import/export JSON.
3. **Quests & Modes:** rename your machine, choose the accent color, and create/reorder/remove up to eight quests.
4. For each quest choose a label, trigger type (pop bumper hits / target hits / successful upper-deck ascents) and completion goal. Each quest pays the existing 2,000-point reward once per game.
5. Optionally enable a timed bonus mode. Customize its name, description, activation event, required event count, bonus event, multiplier (×2 to ×5), and duration (3 to 60 seconds).
6. Click **Save Mission Design** to store the authored table locally, or **Save & Test Table** to return to the playfield ready for a fresh launch.
7. Export a JSON table from the Table Parts tab to share the design; reimport it on another browser to restore the same geometry, quests, and mode.

The visual editor uses a validated, declarative schema. Imported data is **never evaluated as code**.

## Safety, limits and compatibility

- Maximum **8 quests**, goal 1–99 per quest, and three supported event types.
- Imported quests with duplicate IDs are deterministically renamed, preventing multiple objectives from mistakenly completing together.
- Bonus modes accept threshold 1–30 events, duration 3–60 simulated seconds, multiplier ×2–×5.
- Older JSON tables without modes remain valid.
- Presets are **copied** into a new local \`custom\` table when edited, leaving the stock machine untouched.
- No servers, accounts, uploads, unsafe script execution, or copyrighted third-party media.
- User changes persist in localStorage using the existing key \`phiball369-table-v1\`. The browser may delete local data; export JSON for backup.

## Explicit non-goals

Rung 8's quest conditions count an event **category**, not a specific bumper ID, target order, scripted cutscene, or map-region traversal. A later mission editor can add per-part targets, multi-stage quest chains and event conditions without breaking existing authored tables.

The engine is still a two-world Planck simulator with guided 2.5D ramps. Neither the mission editor nor the new layout UI changes physical collision behavior.

## Testing

- \`npm test\` covers quest editor operations, uniqueness, saved JSON roundtrip, bounded mode values, and a real \`PinballGame\` consuming an authored mission.
- \`npm run build\` catches JSX/Vite module and integration errors.
- After CI, manually test creating a mission, saving, exporting, importing and playing it on desktop/mobile. Verify mode countdowns, quest progress, and audio cues still match.
