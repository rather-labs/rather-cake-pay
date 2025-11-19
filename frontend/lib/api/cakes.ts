import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Cake, InsertCake, UpdateCake, CakeMember, User } from '@/types/database'

export type CakeWithMembers = Cake & {
  cake_members: (CakeMember & {
    users: User
  })[]
  created_by_user: User
}

export class CakesAPI {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getCake(cakeId: string): Promise<{ data: CakeWithMembers | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cakes')
        .select(`
          *,
          created_by_user:users!cakes_created_by_fkey(*),
          cake_members(
            *,
            users(*)
          )
        `)
        .eq('id', cakeId)
        .single()

      if (error) throw error
      return { data: data as CakeWithMembers, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUserCakes(userId: string): Promise<{ data: Cake[] | null; error: Error | null }> {
    try {
      // First, get the cake IDs this user is a member of
      const { data: memberships, error: memberError } = await this.supabase
        .from('cake_members')
        .select('cake_id')
        .eq('user_id', userId)

      if (memberError) throw memberError

      if (!memberships || memberships.length === 0) {
        return { data: [], error: null }
      }

      // Then get the actual cakes
      const cakeIds = memberships.map((m: { cake_id: string }) => m.cake_id)
      const { data: cakes, error: cakesError } = await this.supabase
        .from('cakes')
        .select('*')
        .in('id', cakeIds)
        .order('created_at', { ascending: false })

      if (cakesError) throw cakesError

      return { data: cakes as Cake[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createCake(cake: InsertCake, creatorId: string): Promise<{ data: Cake | null; error: Error | null }> {
    try {
      // Create the cake
      const { data: newCake, error: cakeError } = (await this.supabase
        .from('cakes')
        .insert(cake as never)
        .select()
        .single()) as { data: Cake; error: null } | { data: null; error: unknown }

      if (cakeError) throw cakeError

      // Add creator as admin member
      const { error: memberError } = await this.supabase
        .from('cake_members')
        .insert({
          cake_id: newCake!.id,
          user_id: creatorId,
          role: 'admin',
        } as never)

      if (memberError) throw memberError

      return { data: newCake, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateCake(cakeId: string, updates: UpdateCake): Promise<{ data: Cake | null; error: Error | null }> {
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

  async deleteCake(cakeId: string): Promise<{ error: Error | null }> {
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

  async addMember(cakeId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<{ data: CakeMember | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_members')
        .insert({
          cake_id: cakeId,
          user_id: userId,
          role,
        } as never)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async removeMember(cakeId: string, userId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('cake_members')
        .delete()
        .eq('cake_id', cakeId)
        .eq('user_id', userId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async getCakeMembers(cakeId: string): Promise<{ data: (CakeMember & { users: User })[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_members')
        .select(`
          *,
          users(*)
        `)
        .eq('cake_id', cakeId)

      if (error) throw error
      return { data: data as (CakeMember & { users: User })[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateMemberRole(cakeId: string, userId: string, role: 'admin' | 'member'): Promise<{ data: CakeMember | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_members')
        .update({ role } as never)
        .eq('cake_id', cakeId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}
