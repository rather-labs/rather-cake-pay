-- QUICK FIX: Disable RLS for Development
-- ⚠️  WARNING: This removes all security - FOR DEVELOPMENT ONLY!
-- Run this in Supabase SQL Editor if you want the fastest fix

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE cakes DISABLE ROW LEVEL SECURITY;
ALTER TABLE cake_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE cake_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE settlements DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- You should see rowsecurity = false for all tables
