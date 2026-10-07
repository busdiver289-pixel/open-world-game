# Chrono Syndicate: Nightfall

A time-loop heist sandbox RPG set in a neon-noir megacity locked in perpetual darkness.

## Core Concept

**Every run is 15 minutes.** You steal, sabotage, and complete contracts before lockdown resets the city. Your past selves replay their actions as ghosts, allowing multi-loop coordination.

## New Features

### Drivable Vehicles
- Press `F` near parked cars to hijack (sedans, motorcycles)
- Each vehicle has different speed and handling
- Drive across districts to reach objectives faster
- Vehicles appear on minimap

### Heist Contracts
- Visit Contract Terminals (marked in yellow) in each district
- Accept missions with varying difficulty and payouts
- Track active contracts in safehouse
- Complete contracts to gain loot and reputation

#### Contract Types
1. **Data Vault Heist** - Infiltrate corporate tower and extract data
2. **Armored Car Hijack** - Intercept cash transport
3. **Power Grid Sabotage** - Disable security in Industrial Zone
4. **Evidence Plant** - Frame rival gangs at police precinct
5. **Black Market Deal** - Retrieve stolen weapons

### Stealth Takedowns
- Press `SPACE` behind unaware guards for silent elimination
- No suspicion increase
- Loot small amount from defeated guards
- Guards patrol and become alert if they spot you

## Controls

- **Move**: W, A, S, D or arrow keys
- **Change Identity**: 1 (Enforcer), 2 (Officer), 3 (Fixer)
- **Hijack Vehicle**: F
- **Interact**: E (buildings, terminals, safehouse)
- **Stealth Takedown**: SPACE

## Gameplay Loop

1. **Start Run**: Exit safehouse
2. **Accept Contract**: Visit terminal and pick a heist
3. **Plan Approach**: Use ghosts to coordinate distractions
4. **Execute**: Hijack vehicles, perform takedowns, avoid suspicion
5. **Return**: Get back to safehouse before lockdown
6. **Save & Repeat**: Loot is recorded, setup next loop with ghost support

## Districts

- **The Docks**: Harvester territory, armored car hijacks
- **Neon Plaza**: Neon Serpent stronghold, data vaults
- **Industrial Zone**: Iron Syndicate, power grids
- **Uptown**: Corporate security, high-risk infiltration
- **The Sprawl**: Street runners, black market

## Run Locally

```bash
python3 -m http.server 8000
```

Then visit: `http://localhost:8000`
