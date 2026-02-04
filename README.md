# 7 Score

7 Score is a companion scorekeeping app for the card game *Flip 7*. It’s built for live multiplayer sessions, so players and the host stay in sync in real time during lobbies, rounds, and final results.

## Features

- Live multiplayer lobby and game state syncing
- Fast round scoring and totals
- Host controls for rounds and player status
- Mobile-first UI with dark mode support

## Tech Stack

- Next.js (App Router)
- Supabase (auth + realtime + database)
- Tailwind CSS + shared UI package (monorepo)

## Getting Started

```bash
pnpm install
pnpm dev
```

By default, the web app runs from `apps/web`. Environment variables live in `apps/web/.env.local`.

## Scripts

```bash
# Start development (all packages)
pnpm dev

# Production build
pnpm build

# Lint
pnpm lint
```

### Tests

Automated tests are not configured yet. When they’re added, this section will include the test command.

## Database

This project uses Supabase for the database, realtime updates, and auth.

## Repo Structure

- `apps/web` – Next.js app
- `packages/ui` – Shared UI components
- `packages/database` – Database types and tooling

## License

All rights reserved.
