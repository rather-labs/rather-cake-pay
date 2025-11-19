'use server'

import { createClient } from '@/lib/supabase/server'
import { CakesAPI } from '@/lib/api/cakes'
import { UsersAPI } from '@/lib/api/users'
import type { InsertCake } from '@/types/database'

export async function createCake(
  name: string,
  description: string | null,
  iconIndex: number | null,
  creatorId: number,
  memberIds: number[] = [],
  token: string = '0x0000000000000000000000000000000000000000',
  interestRate: number = 0
): Promise<{ data: { id: number; name: string } | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const cakesAPI = new CakesAPI(supabase)
    const usersAPI = new UsersAPI(supabase)

    // Validate that all member IDs are valid users in the database
    if (memberIds.length > 0) {
      const { error: validationError } = await usersAPI.validateUserIds(memberIds)
      if (validationError) {
        return { data: null, error: validationError.message }
      }
    }

    // Normalize token address (0x0 or empty string means native ETH)
    const tokenAddress = !token || token === '0x0' || token.trim() === ''
      ? '0x0000000000000000000000000000000000000000'
      : token.trim()

    const newCake: InsertCake = {
      name,
      description,
      icon_index: iconIndex,
      token: tokenAddress,
      interest_rate: interestRate,
      member_ids: memberIds,
    }

    const { data, error } = await cakesAPI.createCake(newCake, creatorId)

    if (error) {
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: 'Failed to create cake' }
    }

    return { data: { id: data.id, name: data.name }, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

