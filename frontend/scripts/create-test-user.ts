import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

async function createTestUser() {
  const testUser = {
    wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
    username: 'cryptowhale_42',
    avatar_url: null
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(testUser, { onConflict: 'wallet_address' })
    .select()
    .single()

  if (error) {
    console.error('Error creating test user:', error)
    process.exit(1)
  }

  console.log('✅ Test user created successfully!')
  console.log('User ID:', data.id)
  console.log('Wallet:', data.wallet_address)
  console.log('Username:', data.username)
  console.log('\n📝 Update lib/constants.ts with this user ID:')
  console.log(`export const TEST_USER_ID = '${data.id}'`)

  process.exit(0)
}

createTestUser()
