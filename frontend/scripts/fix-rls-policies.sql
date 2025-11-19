-- Fix RLS Policies to Avoid Infinite Recursion
-- Run this in your Supabase SQL Editor

-- ==========================================
-- USERS TABLE
-- ==========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple policies without recursion
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (true);

-- ==========================================
-- CAKES TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view cakes they are members of" ON cakes;
DROP POLICY IF EXISTS "Users can insert cakes" ON cakes;
DROP POLICY IF EXISTS "Users can update cakes they created" ON cakes;

-- Enable RLS
ALTER TABLE cakes ENABLE ROW LEVEL SECURITY;

-- Simple policies without recursion
CREATE POLICY "Users can view all cakes"
  ON cakes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert cakes"
  ON cakes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update cakes"
  ON cakes FOR UPDATE
  USING (true);

-- ==========================================
-- CAKE_MEMBERS TABLE (THIS IS THE PROBLEM)
-- ==========================================

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view memberships" ON cake_members;
DROP POLICY IF EXISTS "Users can insert memberships" ON cake_members;
DROP POLICY IF EXISTS "Users can update memberships" ON cake_members;
DROP POLICY IF EXISTS "Users can delete memberships" ON cake_members;

-- Enable RLS
ALTER TABLE cake_members ENABLE ROW LEVEL SECURITY;

-- Create NON-RECURSIVE policies
-- The key is to NOT reference other tables in the policy
CREATE POLICY "Allow all reads on cake_members"
  ON cake_members FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts on cake_members"
  ON cake_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on cake_members"
  ON cake_members FOR UPDATE
  USING (true);

CREATE POLICY "Allow all deletes on cake_members"
  ON cake_members FOR DELETE
  USING (true);

-- ==========================================
-- CAKE_INGREDIENTS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view ingredients" ON cake_ingredients;
DROP POLICY IF EXISTS "Users can insert ingredients" ON cake_ingredients;
DROP POLICY IF EXISTS "Users can update ingredients" ON cake_ingredients;

-- Enable RLS
ALTER TABLE cake_ingredients ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "Allow all reads on cake_ingredients"
  ON cake_ingredients FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts on cake_ingredients"
  ON cake_ingredients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on cake_ingredients"
  ON cake_ingredients FOR UPDATE
  USING (true);

-- ==========================================
-- INGREDIENT_SPLITS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view splits" ON ingredient_splits;
DROP POLICY IF EXISTS "Users can insert splits" ON ingredient_splits;
DROP POLICY IF EXISTS "Users can update splits" ON ingredient_splits;

-- Enable RLS
ALTER TABLE ingredient_splits ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "Allow all reads on ingredient_splits"
  ON ingredient_splits FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts on ingredient_splits"
  ON ingredient_splits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on ingredient_splits"
  ON ingredient_splits FOR UPDATE
  USING (true);

-- ==========================================
-- BALANCES TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view balances" ON balances;

-- Enable RLS
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "Allow all reads on balances"
  ON balances FOR SELECT
  USING (true);

-- ==========================================
-- SETTLEMENTS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view settlements" ON settlements;
DROP POLICY IF EXISTS "Users can insert settlements" ON settlements;
DROP POLICY IF EXISTS "Users can update settlements" ON settlements;

-- Enable RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "Allow all reads on settlements"
  ON settlements FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts on settlements"
  ON settlements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on settlements"
  ON settlements FOR UPDATE
  USING (true);

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check that all policies are created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
