-- =====================================================
-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE
-- =====================================================
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- Paste this entire content and click RUN
-- =====================================================

-- Disable RLS on all tables
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cakes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cake_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cake_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ingredient_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settlements DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to be sure
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view cakes they are members of" ON cakes;
DROP POLICY IF EXISTS "Users can insert cakes" ON cakes;
DROP POLICY IF EXISTS "Users can update cakes they created" ON cakes;
DROP POLICY IF EXISTS "Users can view memberships" ON cake_members;
DROP POLICY IF EXISTS "Users can insert memberships" ON cake_members;
DROP POLICY IF EXISTS "Users can update memberships" ON cake_members;
DROP POLICY IF EXISTS "Users can delete memberships" ON cake_members;
DROP POLICY IF EXISTS "Allow all reads on cake_members" ON cake_members;
DROP POLICY IF EXISTS "Allow all inserts on cake_members" ON cake_members;
DROP POLICY IF EXISTS "Allow all updates on cake_members" ON cake_members;
DROP POLICY IF EXISTS "Allow all deletes on cake_members" ON cake_members;

-- Verify RLS is disabled
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ ENABLED (BAD)' ELSE '✅ DISABLED (GOOD)' END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- You should see ✅ DISABLED for all tables
