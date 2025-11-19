-- Create test user
-- Run this in your Supabase SQL Editor

INSERT INTO users (wallet_address, username, avatar_url)
VALUES (
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
  'cryptowhale_42',
  null
)
ON CONFLICT (wallet_address) DO UPDATE
SET username = EXCLUDED.username
RETURNING *;
