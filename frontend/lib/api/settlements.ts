import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Settlement, InsertSettlement, UpdateSettlement, User } from '@/types/database'

export type SettlementWithUsers = Settlement & {
  from_user: User
  to_user: User
}

export class SettlementsAPI {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getSettlement(settlementId: string): Promise<{ data: SettlementWithUsers | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('settlements')
        .select(`
          *,
          from_user:users!settlements_from_user_id_fkey(*),
          to_user:users!settlements_to_user_id_fkey(*)
        `)
        .eq('id', settlementId)
        .single()

      if (error) throw error
      return { data: data as SettlementWithUsers, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getCakeSettlements(cakeId: string): Promise<{ data: SettlementWithUsers[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('settlements')
        .select(`
          *,
          from_user:users!settlements_from_user_id_fkey(*),
          to_user:users!settlements_to_user_id_fkey(*)
        `)
        .eq('cake_id', cakeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as SettlementWithUsers[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUserSettlements(userId: string): Promise<{ data: SettlementWithUsers[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('settlements')
        .select(`
          *,
          from_user:users!settlements_from_user_id_fkey(*),
          to_user:users!settlements_to_user_id_fkey(*)
        `)
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as SettlementWithUsers[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createSettlement(settlement: InsertSettlement): Promise<{ data: Settlement | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('settlements')
        .insert(settlement as never)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateSettlement(settlementId: string, updates: UpdateSettlement): Promise<{ data: Settlement | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('settlements')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', settlementId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async markSettlementCompleted(
    settlementId: string,
    transactionHash: string
  ): Promise<{ data: Settlement | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('settlements')
        .update({
          status: 'completed',
          transaction_hash: transactionHash,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', settlementId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async cancelSettlement(settlementId: string): Promise<{ data: Settlement | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('settlements')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', settlementId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}
