# 🔧 Fixing "Infinite Recursion in RLS Policy" Error

## 🚨 The Problem

Error message:
```
Error loading groups: infinite recursion detected in policy for relation "cake_members"
```

### What Causes This?

Row Level Security (RLS) policies can create infinite recursion when:
1. A policy on table A references table B
2. A policy on table B references table A
3. This creates a circular dependency

Example of PROBLEMATIC policies:
```sql
-- ❌ BAD: This can cause infinite recursion
CREATE POLICY "Users can view memberships"
  ON cake_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    cake_id IN (SELECT id FROM cakes WHERE created_by = auth.uid())
    -- ↑ This SELECT causes recursion if cakes table also checks cake_members
  );
```

## ✅ The Solution

We're using **permissive policies** for development/testing:

```sql
-- ✅ GOOD: Simple, non-recursive policy
CREATE POLICY "Allow all reads on cake_members"
  ON cake_members FOR SELECT
  USING (true);
```

### Why This Works

1. **No table joins** - Policies don't reference other tables
2. **No subqueries** - No SELECT statements that could recurse
3. **Simple boolean** - Just `true` for development

### For Production

Later, you'll want to implement proper security with **authenticated user checks**:

```sql
-- For production with wallet auth:
CREATE POLICY "Users can view their memberships"
  ON cake_members FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE wallet_address = current_setting('request.jwt.claim.wallet', true))
  );
```

## 📋 Step-by-Step Fix

### 1. Run the RLS Fix Script

Open Supabase SQL Editor and run:
```bash
scripts/fix-rls-policies.sql
```

This will:
- Drop all existing policies
- Create simple, non-recursive policies
- Enable RLS on all tables
- Allow full access for development

### 2. Verify Policies Were Created

Run this query in Supabase:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see policies like:
- `Allow all reads on cake_members`
- `Allow all inserts on cake_members`
- `Allow all reads on cakes`
- etc.

### 3. Test Your App

```bash
npm run dev
```

Navigate to `/dashboard` - the error should be gone!

## 🔐 Security Note

**Current setup is for DEVELOPMENT only!**

The policies allow unrestricted access. For production:

1. **Implement wallet authentication** properly
2. **Update policies** to check authenticated user
3. **Restrict access** based on actual membership

Example production policy:
```sql
CREATE POLICY "Users see only their cakes"
  ON cakes FOR SELECT
  USING (
    id IN (
      SELECT cake_id
      FROM cake_members
      WHERE user_id = auth.uid()
    )
  );
```

But this requires proper auth middleware setup.

## 📚 Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Common RLS Pitfalls](https://supabase.com/docs/guides/database/postgres/row-level-security#common-rls-pitfalls)
- [Policy Performance](https://supabase.com/docs/guides/database/postgres/row-level-security#policy-performance)

## ✅ Checklist

- [ ] Run `scripts/fix-rls-policies.sql` in Supabase
- [ ] Verify policies were created
- [ ] Test the app - error should be gone
- [ ] Plan for production security policies later
