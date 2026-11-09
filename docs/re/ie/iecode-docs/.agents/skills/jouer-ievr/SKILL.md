---
name: jouer-ievr
description: "Run and play Inazuma Eleven Victory Road from the IECODE workspace: launch nie.exe (game_launch), simulate a match (aphrody-nie-headless/-runtime/-play), render assets (aphrody-nie-game), inspect memory (nie mem). Use to run or reproduce IEVR behaviour."
---

# jouer-ievr

Follow [IECODE scope and execution](../../references/workflow.md).

Select the requested target: launching/observing the original `nie.exe`, deterministic Rust simulation, or native asset rendering. Simulation is not demonstrated game parity. Native game memory mutation requires explicit task scope; game launch alone does not supply synthetic input control.

Check platform, installation and live tool availability. `explorer_status` determines whether the retained loopback bridge has a client; the old Inacord UI is absent from IECODE. Read [launch, simulation and observation procedures](references/details.md) for the selected target; verify each binary's current `--help`.
