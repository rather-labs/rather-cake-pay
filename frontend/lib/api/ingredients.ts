import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CakeIngredient, InsertCakeIngredient, UpdateCakeIngredient } from '@/types/database'

export type IngredientWithDetails = CakeIngredient

export class IngredientsAPI {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getIngredient(ingredientId: number): Promise<{ data: IngredientWithDetails | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .select('*')
        .eq('id', ingredientId)
        .single()

      if (error) throw error
      return { data: data as IngredientWithDetails, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getCakeIngredients(cakeId: number): Promise<{ data: IngredientWithDetails[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .select('*')
        .eq('cake_id', cakeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as IngredientWithDetails[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createIngredient(
    ingredient: InsertCakeIngredient
  ): Promise<{ data: CakeIngredient | null; error: Error | null }> {
    try {
      const { data: newIngredient, error: ingredientError } = (await this.supabase
        .from('cake_ingredients')
        .insert(ingredient as never)
        .select()
        .single()) as { data: CakeIngredient; error: null } | { data: null; error: unknown }

      if (ingredientError) throw ingredientError

      return { data: newIngredient, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateIngredient(
    ingredientId: number,
    updates: UpdateCakeIngredient
  ): Promise<{ data: CakeIngredient | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', ingredientId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async deleteIngredient(ingredientId: number): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('cake_ingredients')
        .delete()
        .eq('id', ingredientId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async markIngredientSubmitted(
    ingredientId: number,
    batchedIngredientsId: string
  ): Promise<{ data: CakeIngredient | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .update({
          status: 'submitted',
          batched_ingredients_id: batchedIngredientsId,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', ingredientId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async markIngredientSettled(ingredientId: number): Promise<{ data: CakeIngredient | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', ingredientId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getPendingIngredients(cakeId: number): Promise<{ data: IngredientWithDetails[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .select('*')
        .eq('cake_id', cakeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as IngredientWithDetails[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  /**
   * Get all non-settled ingredients (pending + submitted)
   * These are expenses that should be included in balance calculations
   */
  async getNonSettledIngredients(cakeId: number): Promise<{ data: IngredientWithDetails[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .select('*')
        .eq('cake_id', cakeId)
        .in('status', ['pending', 'submitted'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as IngredientWithDetails[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}
