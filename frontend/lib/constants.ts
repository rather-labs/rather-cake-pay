// Temporary test user ID - will be replaced with real wallet auth
// This user should exist in your Supabase database
// TODO: After running the SQL script in scripts/create-test-user.sql,
// replace this with the actual user ID from Supabase
export const TEST_USER_ID = 1 // Replace with real user ID after creating user
export const TEST_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2'
export const TEST_USERNAME = 'cryptowhale_42'

// Icon options for cake groups (0-based index stored in icon_index field)
export const ICON_OPTIONS = ['🍰', '🏖️', '🏠', '🍕', '✈️', '🎉', '🎮', '🏃', '🎬', '☕', '🍔', '🎸'] as const
