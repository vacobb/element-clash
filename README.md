# Element Clash

Element Clash is a real-time multiplayer spellcrafting arena game for **2–8 players**, playable in a desktop or phone browser. Players join a shared room using a six-character code, collect elemental ingredients, craft spells, and battle to survive.

The game combines the quick decisions of an arena battle with the strategy of crafting: spend ingredients on a simple spell now, or save them for a larger combination?

## Features

- **26 spell recipes** using combinations of fire, water, earth, and air.
- Recipes using **two to five ingredients**, including upgraded spells and distinct effects.
- Offensive spells, healing potions, shields, movement spells, and area effects.
- Six contextual spell suggestions based on collected ingredients, with a defensive option always in slot 6.
- Offensive suggestions highlight only when a visible opponent is within that spell’s range and ingredients/cooldowns permit casting.
- Automatic targeting with an optional opponent lock.
- Randomized battlefields, obstacles, and accessible ingredient spawns.
- Desktop keyboard controls and mobile controls supporting simultaneous touches.
- Survival, team battles, skirmish, and a practice arena.
- An AI teammate balances odd-numbered team matches, with Easy, Medium, and Hard difficulty.
- Server-authoritative combat and shared room state stored using Netlify Blobs.

## How to play

### Join a battle

1. Open the deployed game in your browser.
2. Create a room and enter your player name.
3. Share the game link and six-character room code with friends.
4. Other players select Join and enter the code.
5. The host chooses the battle settings and starts the game once at least two players are connected.

You can also use the practice arena to learn the controls before joining friends.

### Gather, craft, and cast

Move over glowing ingredients to collect them. You can carry **eight ingredients**, so your inventory choices matter.

The six spell suggestions respond to your inventory. A spell needs its required ingredients and an available cooldown. Offensive spells also need a visible opponent within their individual casting range. Unavailable options are dimmed and explain what is missing.

Select a suggestion to craft and cast it immediately. Larger recipes may create a stronger version of a familiar spell or a different effect entirely. The spellbook lists recipes and lets you explore combinations.

Healing and shields affect your character; they do not require an enemy target. Dashes follow your movement direction. Ingredients are consumed when a spell is successfully crafted.

### Aim and attack

The game automatically targets a nearby visible enemy. Tap or click an opponent to lock onto them; tap or click empty battlefield space to return to automatic targeting. A ring marks the current target, with gold indicating a lock.

If the locked opponent moves out of range or behind cover, automatic targeting can temporarily use another eligible opponent. The lock resumes when its opponent becomes eligible again.

**Basic attacks remain manual.** Acquiring a target never fires them automatically: hold the basic-attack button or Spacebar to shoot.

### Controls

| Action | Desktop | Phone |
| --- | --- | --- |
| Move | WASD or arrow keys | Left movement stick |
| Cast a suggested spell | Click a suggestion or press 1–6 | Tap a suggestion |
| Basic attack | Hold Spacebar or BASIC ATTACK | Hold BASIC ATTACK |
| Lock an opponent | Click the opponent | Tap the opponent |
| Clear target lock | Click empty battlefield space | Tap empty battlefield space |
| Open spellbook | E or Spellbook button | Spellbook button |

Slot **6** always contains a defensive suggestion. On mobile, you can keep moving with one finger while casting or firing with another.

## Rules and scoring

Players begin with **100 health**. Attacks reduce health; shields absorb damage. Healing can restore health, while cooldowns limit repeated use of powerful spells and potions.

| Mode | Goal and outcome |
| --- | --- |
| Survival | Eliminate the other players. The last wizard standing wins; simultaneous final deaths can produce a draw. |
| Teams | Sun and Moon teams fight without friendly fire. The surviving team wins. An odd number of human players adds one computer to the smaller team. |
| Skirmish | A three-minute battle with respawns. Players are ranked by eliminations, then damage dealt. |

In Survival and Teams, the storm begins closing after 90 seconds at standard pace, pushing players toward the center. Eliminated players can spectate, and opponents may collect dropped ingredients.

The results screen shows placement, eliminations, and damage. The host can start a rematch with a newly randomized battlefield. Rounds are independent; there is no cumulative tournament score.

## What went into making it

### Technology

- **HTML and CSS** for the interface and responsive layouts.
- **JavaScript and Canvas** for arena rendering, controls, effects, crafting, and the shared simulation.
- **Vite** for the production frontend build.
- A standard **TypeScript Netlify Function** for multiplayer requests.
- **Netlify Blobs** for persistent room state, using strong consistency and conditional writes.
- **Node.js test scripts** for engine, controls, multiplayer, and deployment-package verification.

### Multiplayer architecture

The frontend calls `/.netlify/functions/game` directly. The function authenticates the player’s room session, reads the current state, advances combat, applies player input, and saves the updated room.

Rooms use a site-scoped Blobs store. New rooms use `onlyIfNew`; updates use `onlyIfMatch` with the room’s ETag. If two requests try to update the same revision, the losing request reloads and retries. Command sequence IDs prevent repeated requests from applying an action twice.

The backend has no continuously running game loop or process-local room cache. Incoming requests advance the authoritative simulation. Client-side animation smooths rendering between snapshots while the server determines combat outcomes.

### Iteration and challenges

The project was developed iteratively with AI-assisted coding and hands-on gameplay feedback. Major challenges included coordinating multiplayer state, making movement and attacks responsive, and keeping the battlefield visible on small screens.

The controls evolved from separate movement, aiming, and casting inputs to automatic targeting with optional target lock. Mobile pointer handling was revised to allow movement and casting at the same time. Spell suggestions became contextual, and per-spell range checks now make availability easier to understand.

Other improvements included randomized maps, obstacle-free ingredient placement, smoother projectile animation, clipboard fallbacks, and computer teammates for uneven teams.

The project provided practice with browser input, game simulation, responsive design, concurrency, and serverless deployment.

## Project structure

| Path | Purpose |
| --- | --- |
| `worker/page.html` | Interface template and styles |
| `worker/client.js` | Browser controls, rendering, and multiplayer requests |
| `worker/engine.js` | Game rules, recipes, combat, maps, and AI |
| `lib/engine.js` | Module version of the shared engine used by the function |
| `lib/game-handler.js` | Request validation and conditional room updates |
| `netlify/functions/game.ts` | The standard Netlify Function entry point |
| `scripts/` | Frontend build, function packaging, and tests |
| `netlify.toml` | Netlify build and function configuration |
| `package.json` / `package-lock.json` | Dependencies and reproducible installation |
| `verification.json` | Recorded multiplayer and package-check results |

The `worker` folder name comes from an earlier version of the project. It contains frontend and shared game source; no continuously running Worker server is deployed.

## Deployment

Sign in to Netlify and upload the **complete project** through [Netlify Drop](https://app.netlify.com/drop). Netlify builds the frontend and packages the function using the included configuration.

Publishing does not require a GitHub connection, local Terminal commands, custom environment variables, API keys, or manual database setup. Netlify supplies the function’s storage credentials and site scope automatically. Upload the full project rather than only its `dist` folder.

If Netlify defaults the project to private, change its visibility in the dashboard so friends can open the game link.

## Development and verification

For contributors working locally, the project requires **Node.js 22.12 or newer**.

```bash
npm ci
npm run build
npm test
```

These commands are for development and verification; they are not required for drag-and-drop publishing. Opening the generated frontend alone does not provide multiplayer—the Netlify Function is needed.

The test suite checks recipes, crafting costs, cooldowns, randomized maps, team balancing, AI difficulty, target selection, range-based highlighting, simultaneous mobile inputs, and room concurrency.

Multiplayer verification completed three rounds with two players through the function extracted from the Netlify-generated package. The winners were Aster, Briar, and Aster. Each winning round recorded one elimination and 100 damage from actual spell/basic-attack combat. A deterministic open firing lane was used as a test fixture.

Storage checks use the real Netlify Blobs SDK against an HTTP protocol emulator that enforces ETags and conditional writes. The production build and function packaging passed. These checks do not constitute a live Netlify deployment test or physical-device browser testing.

## Next steps

- Add more spell combinations and effects.
- Introduce additional arena themes and environmental mechanics.
- Explore progression and cosmetic rewards.
- Continue testing with larger groups and different mobile devices.
- Refine balance, accessibility, and feedback based on player experience.
