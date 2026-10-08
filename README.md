# Element Clash — Netlify-ready

## Publish without commands

1. Sign in to your Netlify account.
2. Open https://app.netlify.com/drop.
3. Drop **netlify-ready-game.zip** onto the Drop zone (or unzip and drop the complete project folder).
4. Wait for the build and deployment, then open the resulting Netlify URL.
5. Create a room; share the link and six-character code with another player.

Upload the complete project, not just `dist`. Signed-in Netlify Drop builds the Vite project and packages the standard function. No GitHub connection, local Terminal commands, API keys, custom environment variables, or database setup are required. If Netlify marks the project private by default, make it public in its dashboard so other players can open the link.

## Gameplay and controls

The existing design, 26 spell recipes, randomized battlefields, 2–8-player rooms, practice mode, survival/team/skirmish rules, bots and controls are preserved. Move with WASD/arrows or the phone's left stick. Offensive suggestions highlight only when a visible enemy is in that spell's range and ingredients/cooldowns allow casting. Tap a suggestion or press 1–6 to cast. Defense stays in slot 6. Tap/click an opponent to lock; empty space clears the lock. Basic attack remains manual: hold BASIC ATTACK or Spacebar.

Each battle finishes with its existing winner and elimination/damage scores. The host can start a rematch; this does not introduce a new best-of-three tournament or cumulative score system.

## Netlify implementation

- Frontend source: `worker/page.html`, `worker/client.js`, `worker/engine.js` (the folder name is historical; no Worker server is deployed).
- Production frontend: `dist/index.html`; generated root `index.html` supports Vite/Drop detection.
- Only function: `netlify/functions/game.ts`.
- Helpers: `lib/game-handler.js`, `lib/engine.js`, outside the functions directory.
- Frontend calls `/.netlify/functions/game` directly. No custom function path or API redirect.
- Site-scoped Netlify Blobs store `element-clash-rooms`, strong consistency for reads, `onlyIfNew` for room creation and `onlyIfMatch` ETags for updates. Conflicts reload and retry; sequence IDs deduplicate commands. Missing ETags fail closed.
- Netlify supplies site scope and storage credentials automatically. No room state is held in process memory. Incoming requests advance the authoritative simulation; there is no running backend loop.
- Rooms become unavailable after six hours without activity. An expiry is stored as metadata; Blobs has no automatic TTL deletion here.

## Verification

The included `verification.json` records a completed two-player, three-round test: Aster wins round 1, Briar wins round 2, Aster wins round 3. Each winning round has one elimination and 100 damage, produced by actual Fireball and basic-attack combat. All rounds execute the function extracted from the Netlify-produced ZIP, using the real Netlify Blobs SDK against an HTTP protocol emulator with atomic conditional writes. A deterministic open firing lane is a test fixture; damage and winners are not injected.

Tests also cover concurrent joins, stale-write rejection, retry/idempotency, session/host checks, target-range highlighting, mobile simultaneous controls, team balancing, recipes and random map validity. The production Vite build and Netlify function packaging succeeded. This is local production-package verification, not a live deployment or physical-phone/browser test.

For development only, package scripts rebuild, package the function and run the checks. Publishing does not require running them. Netlify builds the function itself; local verification archives, installed dependencies, caches and logs are excluded from the upload ZIP.

Netlify reference: https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/
# element-clash
