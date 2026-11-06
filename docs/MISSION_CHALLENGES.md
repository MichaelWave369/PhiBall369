# Rung 10: Mission Challenges

The Mission Workshop now supports optional **time trials, wrong-target penalties, and physical rewards** for ordered multi-stage quests. The rules are declarative JSON. No scripts, backend or external dependencies.

## How to create a challenge

1. Enter Build Mode, choose **Quests & Modes**, and enable **Ordered Secret Mission** for a quest.
2. Toggle **Enable Mission Challenge Rules**.
3. Choose a time limit (0 is unlimited, or 5–120 seconds), wrong-target policy (ignore or reset), completion bonus points (0–20,000) and optional extra ball.
4. Click **Save & Test Table**. The HUD shows the active challenge's timer, reward and reset count. Export table JSON to share it.

A time limit starts with the first *correct* hit of the first stage. It runs in **simulation seconds**, so pausing the game pauses the timer. It expires at the deadline and resets just that quest to its first stage, not all scores and quests.

With Wrong Target → Reset, the player's collision with a different part of the **same event category** as the current exact target restarts the secret sequence. Wrong event categories are ignored. No timer runs until the next correct hit.

Completing the last stage awards the configured quest points once, plus one extra ball if enabled. Extra balls are capped at **nine total in stock**, and are never awarded repeatedly for the same completed quest.

Existing non-staged quests and staged quests without a \`challenge\` block keep the original 2,000-point completion award.

## Preset challenge examples

- **System Breach security override:** 45 seconds, wrong sentry resets, 5,000 points + an extra ball.
- **ARCLight navigation protocol:** 55 seconds, wrong target ignored, 7,500 points.

## JSON example

    {
      "id":"secret","kind":"targetHits","goal":2,
      "label":"Override the doors",
      "stages":[
        {"kind":"targetHits","partId":"sentry-1","goal":1},
        {"kind":"targetHits","partId":"sentry-2","goal":1}
      ],
      "challenge":{
        "seconds":30,"wrongHit":"reset",
        "points":5000,"extraBall":true
      }
    }

The existing validator bounds all values and ignores a challenge on a quest without stages. Unknown part IDs follow the existing safe fallback of matching any part of the same event type.

## Scope

This rung does not implement branching quest graphs, user scripts, hardware-linked actuators or real 3D collision. Timers are per quest, not per stage. A bonus ball increases the current ball inventory, not a guaranteed instant relaunch or ball save.

Run \`npm test\` and \`npm run build\`, then manually exercise timeout/wrong-hit mechanics and the mobile input UI.
