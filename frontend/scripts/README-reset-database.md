# Database Reset Script

This script resets your Supabase database by dropping all existing tables and recreating them with the proper schema.

## ⚠️ Warning

**This will DELETE ALL DATA in your database!** Use only in development or when you want to start fresh.

## Quick Start

### Option 1: Run SQL directly in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor** → https://supabase.com/dashboard/project/YOUR_PROJECT/sql
3. Open the file: `scripts/reset-database.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**

### Option 2: Use Supabase CLI (if installed)

```bash
# Make sure you have Supabase CLI installed
supabase db reset

# Or run the SQL file directly
supabase db execute -f scripts/reset-database.sql
```

## What the Script Does

1. **Drops all tables** (in correct order to handle foreign keys)
   - cake_ingredients
   - cakes
   - users
   - balances (if exists)

2. **Creates all tables** with proper schema matching README.md structure:
   - `users` - User profiles with wallet addresses
   - `cakes` - Expense groups (includes token, interestRate, memberIds array, currentBalances arrays)
   - `cake_ingredients` - Expenses/transactions (includes weights array, payerIds array, amounts array, status, etc.)

3. **Creates indexes** for better query performance

4. **Sets up triggers** for automatic `updated_at` timestamps

5. **Enables Row Level Security (RLS)** and creates policies

## Verification

After running the script, you can verify everything was created correctly:

```sql
-- Check all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check all policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

## Troubleshooting

If you encounter errors:

1. **Foreign key constraint errors**: Make sure you're running the entire script at once, as it drops tables in the correct order.

2. **Permission errors**: Make sure you're using a user with sufficient privileges (usually the service role key or project owner).

3. **RLS policy errors**: If policies already exist, the script will drop them first, so this shouldn't be an issue.

## Schema Overview

The schema matches the structures defined in the root project's README.md:

```
users
  ├── id (BIGSERIAL, PK) - Monotonically increasing integer
  ├── wallet_address (TEXT, UNIQUE)
  ├── username (TEXT)
  ├── avatar_url (TEXT)
  └── timestamps

cakes
  ├── id (BIGSERIAL, PK) - Monotonically increasing integer
  ├── name (TEXT)
  ├── description (TEXT)
  ├── image_url (TEXT)
  ├── category (TEXT)
  ├── token (TEXT) - Token contract address (0x0 for native ETH)
  ├── interest_rate (NUMERIC) - Interest rate for unpaid amounts
  ├── last_cut_at (BIGINT) - Timestamp of last cake cut (uint64)
  ├── last_added_ingredient (BIGINT) - Last added ingredient ID (uint128)
  ├── member_ids (BIGINT[]) - Array of user IDs (uint64[])
  ├── current_balances (TEXT[]) - Current balances per member (uint256[])
  └── timestamps

cake_ingredients
  ├── id (BIGSERIAL, PK) - Monotonically increasing integer
  ├── batched_ingredients_id (TEXT) - On-chain ingredient ID if submitted
  ├── cake_id (BIGINT, FK → cakes.id)
  ├── name (TEXT) - Ingredient/expense name
  ├── description (TEXT) - Extended description
  ├── weights (SMALLINT[]) - Payment weights per member (uint8[])
  ├── payer_ids (BIGINT[]) - Ids of payers (uint64[])
  ├── amounts (TEXT[]) - Amount paid by each payer (uint256 as string)
  ├── receipt_url (TEXT) - URL to uploaded receipt image
  ├── status ('pending' | 'submitted' | 'settled')
  ├── created_at (TIMESTAMPTZ)
  ├── submitted_at (TIMESTAMPTZ) - Blockchain submission timestamp
  ├── settled_at (TIMESTAMPTZ) - Settlement completion timestamp
  └── updated_at (TIMESTAMPTZ)
```

