-- =====================================================
-- Initialize Database with 10 Generic Users
-- =====================================================
-- This script creates 10 generic test users for development
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =====================================================

-- Insert 10 generic users with unique wallet addresses and usernames
-- Uses ON CONFLICT to gracefully handle duplicates if run multiple times

INSERT INTO users (wallet_address, username, avatar_url)
VALUES
  -- User 1
  (
    '0x1111111111111111111111111111111111111111',
    'alice_crypto',
    NULL
  ),
  -- User 2
  (
    '0x2222222222222222222222222222222222222222',
    'bob_blockchain',
    NULL
  ),
  -- User 3
  (
    '0x3333333333333333333333333333333333333333',
    'charlie_web3',
    NULL
  ),
  -- User 4
  (
    '0x4444444444444444444444444444444444444444',
    'diana_defi',
    NULL
  ),
  -- User 5
  (
    '0x5555555555555555555555555555555555555555',
    'eve_ethereum',
    NULL
  ),
  -- User 6
  (
    '0x6666666666666666666666666666666666666666',
    'frank_finance',
    NULL
  ),
  -- User 7
  (
    '0x7777777777777777777777777777777777777777',
    'grace_gas',
    NULL
  ),
  -- User 8
  (
    '0x8888888888888888888888888888888888888888',
    'henry_hash',
    NULL
  ),
  -- User 9
  (
    '0x9999999999999999999999999999999999999999',
    'ivy_innovation',
    NULL
  ),
  -- User 10
  (
    '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'jack_javascript',
    NULL
  )
ON CONFLICT (wallet_address) 
DO UPDATE SET
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW()
RETURNING *;

-- Verify users were created
SELECT 
  id,
  wallet_address,
  username,
  created_at
FROM users
ORDER BY id
LIMIT 10;

