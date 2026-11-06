# PhiBall369 Rung 9: Secret Target Missions

## New capability

Existing category-count quests remain unchanged. Advanced quests can now contain **1 to 6 ordered stages**. Each stage has an event kind (bumper, target, or successful ascent), a goal (1..99), and optionally the ID of one exact part in the table.

A stage is the **only active step** of that quest. A hit on another part does not advance it. Upon completion, the next stage unlocks; one collision can never finish multiple stages of the same quest. Completing the final stage pays the existing one-time 2,000-point quest reward.

Multiple quests can be active simultaneously. Category counters still work as before, including timed signature-mode activation. Stage order is enforced within each advanced quest, not globally between unrelated quests. Incorrect hits are ignored; they do not reset progress.

### Two new original preset missions

**System Breach: Secret Security Override**
1. Hit \`btm-sentry1\` on L1.
2. Hit \`btm-sentry3\` on L1.
3. Hit \`btm-upper-sentry1\` on L2.

**ARCLight 3333: Secret Navigation Protocol**
1. Hit \`arc-beacon1\` on L1.
2. Hit \`arc-beacon4\` on L1.
3. Complete the \`arc-up\` ascent to L2.

Current-stage targets glow with a small **MISSION N** ring. The HUD names the current stage, the exact part ID, and its hit count. Unlocking a new stage triggers a short sound and announcement.

## Visual workshop authoring

Under **Build Mode → Quests & Modes**, choose any quest and check **Ordered Secret Mission**. Create and reorder stages, select exact parts from a filtered dropdown, choose the event type, and set hit counts. The game only offers upper-ascending ramps for a specifically targeted \`rampRuns\` stage.

Save locally or select Save & Test. Table JSON import/export includes the \`stages\` array, so missions can move between browsers without executable scripts.

## Schema extension

Legacy quest remains legal:

    {"id":"q","label":"Three hits","kind":"targetHits","goal":3}

Staged quest:

    {
      "id":"secret","label":"Override the gates",
      "kind":"targetHits","goal":2,
      "stages":[
        {"kind":"targetHits","partId":"sentinel-A","goal":1},
        {"kind":"rampRuns","partId":"upper-ramp","goal":1}
      ]
    }

The root \`kind\` and \`goal\` remain required for backward compatibility. When \`stages\` is present, progress is controlled by the ordered stages instead of the root total.

Validation limits stage count to six, bounds hit goals, accepts only known event kinds, and requires an exact part ID to match the relevant physics fixture. Invalid or removed IDs are downgraded to an unrestricted match of the same event type, preventing an old custom table from becoming impossible to finish. Legacy files without \`stages\` behave exactly as before.

## Limits

Target selection uses literal part IDs, not named regions, Lua, scripts, conditional expressions, or arbitrary event code. No per-stage timeouts, wrong-target resets, custom per-stage prizes, or branching logic are present yet. Physical ramps remain guided 2.5D traversals with Planck 2D deck collisions.

## Verification

Use \`npm test\` for sequence ordering, exact IDs, no double count, stage goal progress, preset part eligibility, game integration, safe import, and save roundtrip. Use \`npm run build\` to check the React UI. On the deployed arcade, manually verify highlights, upper-deck stage transfers, editor dropdowns, sound, and import/export.
