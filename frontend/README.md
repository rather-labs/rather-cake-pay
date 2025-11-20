# Rather Cake Pay - Frontend

TypeScript/Next.js for the Rather Cake Pay bill splitting application.

## Features

- Miniapp framework embeddings
- Wallet connection
- Cake creation and management
- Cake ingredient tracking
- Payment settlement interface
- Real-time updates
- User position visualization among different
  - Leaderbords
  - Yields earning with uncut cakes

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Wallet (MetaMask or similar) for blockchain interactions

### Installation

```bash
npm install
```

### Database Setup

This application supports both **hosted Supabase** and **local Supabase** (PostgreSQL). See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

**Quick setup for local development:**

1. Install Supabase CLI: `npm install -g supabase` or `brew install supabase/tap/supabase`
2. Start local Supabase: `supabase start`
3. Create `.env.local` file:
   ```bash
   NEXT_PUBLIC_USE_LOCAL_SUPABASE=true
   ```
4. Set up database schema: `supabase db execute -f scripts/reset-database.sql`

**Quick setup for hosted Supabase:**

1. Create a Supabase project at https://supabase.com
2. Create `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Run `scripts/reset-database.sql` in your Supabase SQL Editor

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See [.env.example](./.env.example) for all available environment variables.

### Required Variables

**Database:**
- `NEXT_PUBLIC_SUPABASE_URL` (or `NEXT_PUBLIC_USE_LOCAL_SUPABASE=true`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional if using local Supabase)

**Contract Addresses (at least one required based on your target chain):**
- `NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET` - Ethereum Mainnet (chainId: 1)
- `NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA` - Ethereum Sepolia (chainId: 11155111)
- `NEXT_PUBLIC_CONTRACT_ADDRESS_BASE_SEPOLIA` - Base Sepolia (chainId: 84532)
- `NEXT_PUBLIC_CONTRACT_ADDRESS_LOCALHOST` - Localhost/Hardhat (chainId: 1337 or 31337)

The application automatically uses the correct contract address based on the connected chain. You only need to configure the addresses for the chains you plan to use.

## TODOs

- Add script for local and remote deployment
- Implement server side database managing and ingredient batching
- Implement frontend with various miniapp embeddings
- Add AI Agent integration to allow actions via chat
