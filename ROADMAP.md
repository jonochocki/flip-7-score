# Flip 7 Scorekeeper Roadmap

This document captures the current plan and decisions for the Flip 7 scorekeeping app.

## Decisions and Constraints

- Hosting: self-hosted (no Vercel).
- Lobby code: 6 characters.
- Player profile: name + optional avatar/color set on join; no edits mid-game.
- Host is also a player; host has extra lobby controls.
- Each player submits their own round score.
- Host can start next round only after all active players submit scores.
- Scoreboard is a separate URL viewable with the lobby code.
- Provide a lightweight API endpoint for external apps to fetch lobby + scores.
- Host commonly creates a game on phone and displays QR on their screen for joining.
- Data retention: auto-delete inactive games after 2 hours (temporary, no history).

## Core User Flows

### Host

1. Create game -> lobby code + QR displayed.
2. Players join and appear in lobby list.
3. Start game when ready.
4. For each round:
   - Players submit their own scores.
   - Host advances to next round after all required submissions.
5. End game when target score reached.

### Player

1. Scan QR or enter lobby code.
2. Enter name + optional avatar/color.
3. In game view, see:
   - Name and total score at top.
   - Card grid UI at bottom (design later).
4. Submit round score at end of round.

### Scoreboard

- Read-only view accessible by URL + lobby code.
- Optimized for large display (TV/screen).
- Live updates via realtime subscription.

## MVP Feature Set

- Lobby creation and join by 6-character code.
- QR code generation for lobby.
- Realtime lobby player list.
- Start game control (host only).
- Round submission per player.
- Round-lock until all active players submit.
- Scoreboard view (read-only).
- Lightweight API endpoint for lobby state + scores.

## Next.js Routes and UI State Map

### Routes

- `/` home: create game or enter lobby code
- `/[code]` join + lobby + game (single route)
- `/scoreboard/[code]` public scoreboard: read-only live view
- `/api/game/[code]` API: lobby state + scores (server route, clean JSON)

### Page States

- `home`: idle, create_loading, join_loading, error
- `[code]`: join_ready, join_submitting, lobby_loading, lobby_active, game_loading, round_open, score_submitting, round_locked
- `scoreboard`: loading, live, no_game

### Realtime Subscriptions per Page

- `[code]`: games, players, rounds, round_scores
- `scoreboard`: games, players, rounds, round_scores

### Core Components (MVP)

- `AppLayout`: shared shell
- `GameHeader`: game code + status
- `PlayerBadge`: name + avatar + color
- `LobbyList`: roster + join count
- `QRCodeCard`: QR + share link
- `RoundScoreForm`: player score input
- `ScoreTable`: per-round + totals
- `HostControls`: start/advance round, set statuses

### Client Data Access

- `create_game` RPC (host create)
- `join_game` RPC (player join)
- `start_game` RPC (host start)
- `submit_score` RPC (player submit)
- `can_advance_round` RPC (host gate)

### Navigation Rules

- On create_game -> `/[code]` (host)
- On join_game -> `/[code]`
- When game status changes to `active` -> show game state within `/[code]`
- Scoreboard is always accessible by URL

### Host Identity

- First player to create the lobby is the host.
- Store a host key in browser local storage so host can refresh/rejoin and retain host privileges.

## Score Submission Rules (Draft)

- Submissions allowed only for current round.
- Eligible to submit: `active`, `frozen`, `stayed`, `busted`.
- Ineligible: `left`.
- `busted` scores are forced to 0.
- `flip7_bonus` allowed only for non-busted players.
- Host can advance round only when `missing_submissions(game_id) = 0`.
- Round scores are upserted; resubmission overwrites prior entry.

## Score Validation (Client)

- Disallow negative score input.
- Default score to 0 for empty submission.
- Disable submit if round is locked.

## Scale and Optimization Notes

- Realtime: subscribe only to a single game (filter by `game_id`).
- Data size: load only latest round by default; paginate round history.
- Totals: compute server-side via view/RPC to avoid large client aggregations.
- Indexing: keep `game_id` indexes on `players`, `rounds`, `round_scores`.
- Writes: prefer RPCs for mutations to reduce round trips.
- API: cache `/api/game/[code]` responses for short TTL (5–15s).
- Cleanup: scheduled job to delete games inactive > 2 hours.

## Data Model (Draft)

- games: id, code, status, created_at, host_player_id
- players: id, game_id, name, avatar, color, seat_order, status, joined_at
- rounds: id, game_id, index, started_at, ended_at
- round_scores: id, round_id, player_id, score, flip7_bonus, busted, submitted_at

## Realtime and Rules

- Players/scoreboard subscribe to games, players, rounds, round_scores.
- Host actions write to Supabase; all clients update in realtime.
- Host can advance round only when:
  - All active players have round_scores for the current round.

## Status Notes

- player_status enum includes "frozen" to represent a frozen player that is still in the round.

## API Surface (Draft)

- GET /api/game/{code}
  - Returns game, players, current round, scores, totals.

## Next Steps

1. Finalize data model + RLS approach.
2. Confirm routing and UI state map.
3. Define score submission rules and validations.
4. Decide whether to compute totals server-side or client-side.

## Supabase SQL Log (Applied)

### Schema + Utilities

- Extensions: `pgcrypto`
- Enums: `game_status` (`lobby`, `active`, `finished`)
- Enums: `player_status` (`active`, `busted`, `stayed`, `left`, `frozen`)
- Trigger helper: `set_updated_at()`

### Tables

- `games`
- `players`
- `rounds`
- `round_scores`

### Indexes and Constraints

- Unique: `games.code`
- Unique: `rounds.game_id + rounds.round_index`
- Indexes: `players.game_id`, `players.user_id`, `rounds.game_id`, `round_scores.round_id`, `round_scores.player_id`
- FK: `games.host_player_id -> players.id`
- `updated_at` triggers on `games`, `players`

### RLS

- Enabled on: `games`, `players`, `rounds`, `round_scores`
- `games`: select for members; update for host
- `players`: select for members; update for self or host
- `rounds`: select for members; insert/update/delete for host
- `round_scores`: select for members; insert/update for self

### SQL Functions and RPC

- Helper: `is_game_member(game_id)`
- Helper: `is_game_host(game_id)`
- Helper: `generate_game_code()`
- RPC: `create_game(name, avatar, color)`
- RPC: `join_game(code, name, avatar, color)`
- RPC: `start_game(game_id)` (host only)
- Helper: `missing_submissions(game_id)`
- RPC: `can_advance_round(game_id)`
- Trigger: `enforce_busted_score()` on `round_scores` to set `score=0` and `flip7_bonus=false` when player status is `busted`
- RPC: `submit_score(round_id, score, flip7_bonus)` (self-only submission for current round; busted auto-0)
- Function: `cleanup_inactive_games()` (deletes games with `updated_at` > 2 hours old)
- Job: `pg_cron` scheduled cleanup every 15 minutes
