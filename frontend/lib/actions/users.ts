'use server'

import { createClient } from '@/lib/supabase/server'
import { UsersAPI } from '@/lib/api/users'
import type { User } from '@/types/database'

export async function searchUsers(query: string): Promise<{ data: User[] | null; error: string | null }> {
  try {
    if (!query || query.trim().length === 0) {
      return { data: [], error: null }
    }

    const supabase = await createClient()
    const usersAPI = new UsersAPI(supabase)

    const { data, error } = await usersAPI.searchUsersByUsername(query.trim(), 10)

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data || [], error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function registerUser(
  walletAddress: string,
  username: string,
  avatarUrl: string | null = null
): Promise<{ data: User | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const usersAPI = new UsersAPI(supabase)

    // Check if user already exists
    const { data: existingUser } = await usersAPI.getUserByWalletAddress(walletAddress)
    if (existingUser) {
      return { data: existingUser, error: null }
    }

    // Create new user
    const { data: newUser, error: createError } = await usersAPI.createUser({
      wallet_address: walletAddress,
      username: username,
      avatar_url: avatarUrl,
    })

    if (createError) {
      // Check if it's a unique constraint violation
      if (createError.message.includes('duplicate') || createError.message.includes('unique')) {
        // User was created between check and insert, fetch it
        const { data: user } = await usersAPI.getUserByWalletAddress(walletAddress)
        return { data: user, error: null }
      }
      return { data: null, error: createError.message }
    }

    return { data: newUser, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function checkUserExists(walletAddress: string): Promise<{ exists: boolean; user: User | null }> {
  try {
    const supabase = await createClient()
    const usersAPI = new UsersAPI(supabase)

    const { data: user } = await usersAPI.getUserByWalletAddress(walletAddress)
    return { exists: !!user, user }
  } catch (error) {
    console.error('Failed to check if user exists:', error)
    return { exists: false, user: null }
  }
}
