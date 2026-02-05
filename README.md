<br/>
<p align="center">
  <a href="https://github.com/jonochocki/flip-7-score">
    <img src="apps/web/public/assets/img/card-fan.png" alt="7 Score" width="500">
  </a>

  <h3 align="center">7 Score</h3>

  <p align="center">
    A live multiplayer scorekeeping companion for the card game Flip 7.
    <br/>
    <br/>
  </p>
</p>

![Contributors](https://img.shields.io/github/contributors/jonochocki/flip-7-score?color=dark-green) ![Stargazers](https://img.shields.io/github/stars/jonochocki/flip-7-score?style=social) ![Issues](https://img.shields.io/github/issues/jonochocki/flip-7-score)

## Table Of Contents

* [About The Project](#about-the-project)
* [Status](#status)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Quick Start](#quick-start)
* [Scripts](#scripts)
* [Database](#database)
* [Project Structure](#project-structure)
* [License](#license)

## About The Project

7 Score is a companion scorekeeper for the card game Flip 7. It’s built for live multiplayer sessions, keeping players and the host in sync in real time during lobbies, rounds, and final results.

## Status

⚠️ Active development ⚠️  
Contributions are welcome but proceed at your own risk.

## Getting Started

### Prerequisites

- Node.js `>=20`
- pnpm `10.x`

### Quick Start

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

## Project Structure

- `apps/web` – Next.js app
- `packages/ui` – Shared UI components
- `packages/database` – Database types and tooling

## License

All rights reserved.
