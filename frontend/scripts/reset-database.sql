-- =====================================================
-- Reset Supabase Database - Drop and Recreate Tables
-- =====================================================
-- This script will:
-- 1. Drop all existing tables (in correct order for foreign keys)
-- 2. Recreate all tables with proper schema matching README.md structure
-- 3. Set up RLS policies
-- 4. Create indexes
-- =====================================================
-- ⚠️  WARNING: This will DELETE ALL DATA!
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =====================================================

-- =====================================================
-- STEP 1: Drop all existing tables (in reverse dependency order)
-- =====================================================

-- Drop tables that have foreign keys first
DROP TABLE IF EXISTS cake_ingredients CASCADE;
DROP TABLE IF EXISTS cakes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS balances CASCADE;

-- =====================================================
-- STEP 2: Create tables (in dependency order)
-- =====================================================

-- Users table - base table for all user data
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cakes table - represents expense groups
-- Structure matches README.md: Cake (Group) definition
CREATE TABLE cakes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  token TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000', -- Token contract address (0x0 for native ETH)
  interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 0, -- Interest rate to be added to unpaid amounts
  last_cut_at BIGINT, -- Timestamp of last cake cut (uint64)
  last_added_ingredient BIGINT, -- Last added ingredient ID (uint128)
  member_ids BIGINT[], -- Array of user IDs (uint64[])
  current_balances TEXT[], -- Current balances per member (uint256[] as strings)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cake ingredients - represents expenses/transactions
-- Structure matches README.md: Cake Ingredient (Expense) definition
CREATE TABLE cake_ingredients (
  id BIGSERIAL PRIMARY KEY,
  batched_ingredients_id TEXT, -- On-chain ingredient ID (if batched and submitted)
  cake_id BIGINT NOT NULL REFERENCES cakes(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Ingredient/expense name
  description TEXT, -- Extended description
  weights SMALLINT[], -- Payment weights per member (uint8[])
  payer_ids BIGINT[], -- Ids of payers (uint64[])
  amounts TEXT[], -- Amount paid by each payer (uint256 as string)
  receipt_url TEXT, -- URL to uploaded receipt image
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'settled')), -- Submission status
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ, -- Blockchain submission timestamp
  settled_at TIMESTAMPTZ, -- Settlement completion timestamp
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STEP 3: Create indexes for better query performance
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- Cakes indexes
CREATE INDEX idx_cakes_token ON cakes(token);
CREATE INDEX idx_cakes_category ON cakes(category);
CREATE INDEX idx_cakes_created_at ON cakes(created_at);
CREATE INDEX idx_cakes_last_cut_at ON cakes(last_cut_at);

-- Cake ingredients indexes
CREATE INDEX idx_cake_ingredients_cake_id ON cake_ingredients(cake_id);
CREATE INDEX idx_cake_ingredients_batched_ingredients_id ON cake_ingredients(batched_ingredients_id);
CREATE INDEX idx_cake_ingredients_status ON cake_ingredients(status);
CREATE INDEX idx_cake_ingredients_created_at ON cake_ingredients(created_at);
CREATE INDEX idx_cake_ingredients_submitted_at ON cake_ingredients(submitted_at);

-- =====================================================
-- STEP 4: Create updated_at trigger function
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cakes_updated_at
  BEFORE UPDATE ON cakes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cake_ingredients_updated_at
  BEFORE UPDATE ON cake_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 5: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cake_ingredients ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: Create RLS Policies
-- =====================================================

-- Users policies
CREATE POLICY "Allow all reads on users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts on users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on users"
  ON users FOR UPDATE
  USING (true);

-- Cakes policies
CREATE POLICY "Allow all reads on cakes"
  ON cakes FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts on cakes"
  ON cakes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on cakes"
  ON cakes FOR UPDATE
  USING (true);

CREATE POLICY "Allow all deletes on cakes"
  ON cakes FOR DELETE
  USING (true);

-- Cake ingredients policies
CREATE POLICY "Allow all reads on cake_ingredients"
  ON cake_ingredients FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts on cake_ingredients"
  ON cake_ingredients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on cake_ingredients"
  ON cake_ingredients FOR UPDATE
  USING (true);

CREATE POLICY "Allow all deletes on cake_ingredients"
  ON cake_ingredients FOR DELETE
  USING (true);

-- =====================================================
-- STEP 7: Verification
-- =====================================================

-- Verify all tables were created
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify all policies were created
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify all indexes were created
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
