import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Cake, InsertCake, UpdateCake, User } from '@/types/database'

export type CakeWithMembers = Cake & {
  members?: User[] // Optional: populated when fetching with member details
}

export class CakesAPI {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getCake(cakeId: number): Promise<{ data: CakeWithMembers | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cakes')
        .select('*')
        .eq('id', cakeId)
        .single()

      if (error) throw error
      return { data: data as CakeWithMembers, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getCakeWithMemberDetails(cakeId: number): Promise<{ data: CakeWithMembers | null; error: Error | null }> {
    try {
      const { data: cake, error: cakeError } = await this.supabase
        .from('cakes')
        .select('*')
        .eq('id', cakeId)
        .single()

      if (cakeError) throw cakeError
      const cakeData = cake as Cake | null
      if (!cakeData || !cakeData.member_ids || cakeData.member_ids.length === 0) {
        return { data: { ...cakeData, members: [] } as CakeWithMembers, error: null }
      }

      // Fetch user details for member IDs
      // Note: member_ids are BIGINT (on-chain IDs), but users.id is UUID
      // This is a limitation - we may need a mapping table or different approach
      // For now, we'll return the cake with member_ids as-is
      return { data: cakeData as CakeWithMembers, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUserCakes(userId: number): Promise<{ data: Cake[] | null; error: Error | null }> {
    try {
      // Query cakes where the user's ID is in the member_ids array
      const { data: cakes, error: cakesError } = await this.supabase
        .from('cakes')
        .select('*')
        .contains('member_ids', [userId])
        .order('created_at', { ascending: false })

      if (cakesError) throw cakesError

      return { data: cakes as Cake[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createCake(cake: InsertCake, creatorId: number): Promise<{ data: Cake | null; error: Error | null }> {
    try {
      // Ensure creator is in member_ids
      const currentMemberIds = cake.member_ids || []
      const memberIds = currentMemberIds.includes(creatorId)
        ? currentMemberIds
        : [...currentMemberIds, creatorId]

      const cakeWithCreator: InsertCake = {
        ...cake,
        member_ids: memberIds,
      }

      // Create the cake
      const { data: newCake, error: cakeError } = (await this.supabase
        .from('cakes')
        .insert(cakeWithCreator as never)
        .select()
        .single()) as { data: Cake; error: null } | { data: null; error: unknown }

      if (cakeError) throw cakeError

      if (!newCake) {
        throw new Error('Failed to create cake')
      }

      return { data: newCake, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateCake(cakeId: number, updates: UpdateCake): Promise<{ data: Cake | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cakes')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', cakeId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async deleteCake(cakeId: number): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('cakes')
        .delete()
        .eq('id', cakeId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async addMember(cakeId: number, memberId: number): Promise<{ data: Cake | null; error: Error | null }> {
    try {
      // Get current cake
      const { data: cake, error: fetchError } = await this.supabase
        .from('cakes')
        .select('member_ids')
        .eq('id', cakeId)
        .single()

      if (fetchError) throw fetchError
      const cakeData = cake as { member_ids: number[] | null } | null
      if (!cakeData) throw new Error('Cake not found')

      // Add member to array if not already present
      const currentMembers = cakeData.member_ids || []
      if (currentMembers.includes(memberId)) {
        // Member already exists
        const { data: existingCake, error: fetchError } = await this.supabase
          .from('cakes')
          .select('*')
          .eq('id', cakeId)
          .single()
        if (fetchError) throw fetchError
        return { data: existingCake as Cake, error: null }
      }

      const updatedMembers = [...currentMembers, memberId]

      // Update cake with new member
      const { data: updatedCake, error: updateError } = await this.supabase
        .from('cakes')
        .update({ member_ids: updatedMembers, updated_at: new Date().toISOString() } as never)
        .eq('id', cakeId)
        .select()
        .single()

      if (updateError) throw updateError
      return { data: updatedCake, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async removeMember(cakeId: number, memberId: number): Promise<{ data: Cake | null; error: Error | null }> {
    try {
      // Get current cake
      const { data: cake, error: fetchError } = await this.supabase
        .from('cakes')
        .select('member_ids')
        .eq('id', cakeId)
        .single()

      if (fetchError) throw fetchError
      const cakeData = cake as { member_ids: number[] | null } | null
      if (!cakeData) throw new Error('Cake not found')

      // Remove member from array
      const currentMembers = cakeData.member_ids || []
      const updatedMembers = currentMembers.filter((id: number) => id !== memberId)

      // Update cake with updated member list
      const { data: updatedCake, error: updateError } = await this.supabase
        .from('cakes')
        .update({ member_ids: updatedMembers, updated_at: new Date().toISOString() } as never)
        .eq('id', cakeId)
        .select()
        .single()

      if (updateError) throw updateError
      return { data: updatedCake, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getCakeMembers(cakeId: number): Promise<{ data: number[] | null; error: Error | null }> {
    try {
      const { data: cake, error } = await this.supabase
        .from('cakes')
        .select('member_ids')
        .eq('id', cakeId)
        .single()

      if (error) throw error
      const cakeData = cake as { member_ids: number[] | null } | null
      return { data: cakeData?.member_ids || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}
