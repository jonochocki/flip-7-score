# Database Types

This package contains TypeScript types generated from the Supabase database schema.

## Setup

The project ID is already configured in `package.json` (extracted from `apps/web/.env.local`).

**Generate types:**
   ```bash
   cd packages/database
   pnpm types:generate
   ```

4. **(Optional) If you have a cron schema, generate those types:**
   ```bash
   pnpm cron:generate
   ```

## Usage

Import types in your application:

```typescript
import type { Database } from "@workspace/database";

// Use Database types with Supabase client
const supabase = createClient<Database>();
```

## Running from root

You can also run the type generation from the project root:

```bash
pnpm --filter @workspace/database types:generate
```
