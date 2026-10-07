# Chrono Syndicate: Nightfall

A time-loop heist sandbox RPG set in a neon-noir megacity locked in perpetual darkness.

## Core Concept

**Every run is 15 minutes.** You steal, sabotage, and complete contracts before lockdown resets the city. But here's the twist: **your past selves replay their actions as ghosts**, allowing you to coordinate multi-loop heists with perfect timing.

## Features

- **15-Minute Time Loop**: Complete your objectives before the grid locks down.
- **Ghost Replay System**: Past runs execute their recorded actions, visible as semi-transparent replays.
- **Cover Identities**:
  - **Enforcer** (Red): Higher heat with gangs, lower suspicion in crime zones
  - **Officer** (Blue): Blend in at police stations, suspicious in gang territory
  - **Fixer** (Gold): Neutral, access to black market areas
- **Suspicion & Heat System**: Moving, running, or entering restricted zones builds suspicion.
- **EMP Technology**: Press `F` to blackout security cameras and drones in a 500px radius.
- **District Control**: 5 unique districts controlled by different factions.
- **Persistent Safehouse**: Save your loot and review past loops between runs.

## Controls

- **Move**: W, A, S, D or arrow keys
- **Change Identity**: 1 (Enforcer), 2 (Officer), 3 (Fixer)
- **EMP Blackout**: F
- **Interact**: E (buildings, safehouse)
- **Return to Safehouse**: E (at safehouse location)

## Gameplay Loop

1. **Start Run**: Exit safehouse into the city
2. **Plan & Execute**: Complete objectives, avoid suspicion, coordinate with past ghosts
3. **Return**: Make it back to safehouse before lockdown
4. **Save**: Loot is recorded, past actions replay as ghosts next loop
5. **Loop Again**: Use ghost coordination to execute complex multi-run heists

## Districts

- **The Docks**: Harvester faction territory
- **Neon Plaza**: Neon Serpent stronghold
- **Industrial Zone**: Iron Syndicate controlled
- **Uptown**: Corporate security zones
- **The Sprawl**: Street runner haven

## Future Mechanics

- Faction-specific missions and reputation
- Vehicle hijacking and driving
- Stealth takedowns and disguises
- Procedural event generation
- Economy and black market trading
- Multi-agent coordination UI

## Run Locally

```bash
python3 -m http.server 8000
```

Then visit: `http://localhost:8000`
