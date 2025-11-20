import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, User, InsertUser, UpdateUser } from '@/types/database'

export class UsersAPI {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getUser(userId: number): Promise<{ data: User | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUserByWalletAddress(walletAddress: string): Promise<{ data: User | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createUser(user: InsertUser): Promise<{ data: User | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert(user as never)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateUser(userId: number, updates: UpdateUser): Promise<{ data: User | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getOrCreateUser(walletAddress: string, username: string, userData?: Partial<InsertUser>): Promise<{ data: User | null; error: Error | null }> {
    try {
      // First try to get existing user
      const { data: existingUser } = await this.getUserByWalletAddress(walletAddress)

      if (existingUser) {
        return { data: existingUser, error: null }
      }

      // Create new user if doesn't exist
      const newUser: InsertUser = {
        wallet_address: walletAddress,
        username: username,
        avatar_url: userData?.avatar_url || null,
      }

      return await this.createUser(newUser)
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async searchUsersByUsername(query: string, limit = 10): Promise<{ data: User[] | null; error: Error | null }> {
    try {
      if (!query || query.trim().length === 0) {
        return { data: [], error: null }
      }

      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .ilike('username', `${query.trim()}%`)
        .limit(limit)
        .order('username', { ascending: true })

      if (error) throw error
      return { data: data as User[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async validateUserIds(userIds: number[]): Promise<{ data: User[] | null; error: Error | null }> {
    try {
      if (userIds.length === 0) {
        return { data: [], error: null }
      }

      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .in('id', userIds)

      if (error) throw error
      
      // Check if all requested IDs were found
      const users = (data || []) as User[]
      const foundIds = new Set(users.map((user) => user.id))
      const missingIds = userIds.filter((id) => !foundIds.has(id))
      
      if (missingIds.length > 0) {
        return {
          data: null,
          error: new Error(`Invalid user IDs: ${missingIds.join(', ')}`),
        }
      }

      return { data: users, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}
