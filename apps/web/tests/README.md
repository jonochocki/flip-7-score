# Playwright Tests (Apps/Web)

This folder contains end-to-end Playwright tests for the Next.js web app.

## Quick Start

1. Install dependencies (repo root):
   ```bash
   pnpm install
   ```

2. Install Playwright browsers (apps/web):
   ```bash
   cd apps/web
   pnpm exec playwright install
   ```

3. Ensure Supabase env vars are set for the web app:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

4. Run tests (apps/web):
   ```bash
   pnpm test:e2e
   ```

To run a single test by name:
```bash
pnpm exec playwright test --grep "full game"
```

## Project Conventions

- Tests live in `apps/web/tests` and use `@playwright/test`.
- The Playwright config is in `apps/web/playwright.config.ts`.
- The dev server is started automatically by Playwright using Next dev.
- Default base URL is `http://127.0.0.1:3010` (override with `PLAYWRIGHT_PORT`).

## UI Flow Map (High Level)

- **Host start**: `/start` → enter host name → `Enter Lobby` → `/lobby/{code}`
- **Players join**: `/lobby/{code}` → enter name → `Join Lobby`
- **Start game**: host clicks `Start Game` → `/game/{code}`
- **Round submit**: pick cards from the card grid → `Submit Score`
- **Round summary**: appears when all players submit
- **Next round**: host clicks `Start Next Round`
- **Game end**: when any player reaches 200 → `Winner` screen

## Test Structure Guidelines

- Use **isolated browser contexts** per player so localStorage and sessions do not collide:
  ```ts
  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  ```

- Prefer **labels and role-based selectors** instead of brittle CSS where possible:
  ```ts
  page.getByLabel("Your Name").fill("Player One");
  page.getByRole("button", { name: "Join Lobby" }).click();
  ```

- Use deterministic actions where possible for stability. For example, in the full game flow the host uses a known high-scoring hand:
  ```ts
  const hostWinningHand = ["12", "11", "10", "+10", "x2"];
  ```

- For randomness (e.g., player card choices), **limit scope** and prefer unique selection.

- Always wait for state transitions:
  - Lobby → Game: `page.waitForURL("**/game/{code}")`
  - Round Summary: `getByRole("heading", { name: "Round Summary" })`
  - Endgame: `getByRole("heading", { name: "Winner" })`

## Video/Trace Artifacts

- Videos and traces are enabled in `playwright.config.ts`.
- The full game test records **one video per player** in:
  - `apps/web/test-results/host-flow-videos/host.webm`
  - `apps/web/test-results/host-flow-videos/player-one.webm`
  - `apps/web/test-results/host-flow-videos/player-two.webm`

To view a trace:
```bash
pnpm exec playwright show-trace test-results/**/trace.zip
```

## Common Pitfalls

- **No video files?** If a test creates its own contexts, you must pass `recordVideo` when calling `browser.newContext()`.
- **Wrong server?** The test runner starts Next on `127.0.0.1:3010`. If you see unexpected UI, confirm no other app is running on that port.
- **Session gating**: All pages rely on anonymous Supabase sessions. If env vars are missing, pages will stop at the session error state.

## Adding New Tests

When creating new tests, follow this checklist:

- [ ] Use separate browser contexts for each player session.
- [ ] Wait for UI states to be visible before acting.
- [ ] Prefer stable selectors (role, label, visible text).
- [ ] Keep the flow close to real user actions (no direct API calls).
- [ ] Clean up video outputs if you generate custom files.
