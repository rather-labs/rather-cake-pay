import { SupabaseClient } from '@supabase/supabase-js'
import { Database, CakeIngredient, InsertCakeIngredient, UpdateCakeIngredient, IngredientSplit, InsertIngredientSplit, User } from '@/types/database'

export type IngredientWithSplits = CakeIngredient & {
  ingredient_splits: (IngredientSplit & {
    users: User
  })[]
  paid_by_user: User
}

export class IngredientsAPI {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getIngredient(ingredientId: string): Promise<{ data: IngredientWithSplits | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .select(`
          *,
          paid_by_user:users!cake_ingredients_paid_by_fkey(*),
          ingredient_splits(
            *,
            users(*)
          )
        `)
        .eq('id', ingredientId)
        .single()

      if (error) throw error
      return { data: data as IngredientWithSplits, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getCakeIngredients(cakeId: string): Promise<{ data: IngredientWithSplits[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('cake_ingredients')
        .select(`
          *,
          paid_by_user:users!cake_ingredients_paid_by_fkey(*),
          ingredient_splits(
            *,
            users(*)
          )
        `)
        .eq('cake_id', cakeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as IngredientWithSplits[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createIngredient(
    ingredient: InsertCakeIngredient,
    splits: Omit<InsertIngredientSplit, 'ingredient_id'>[]
  ): Promise<{ data: CakeIngredient | null; error: Error | null }> {
    try {
      // Create the ingredient
      const { data: newIngredient, error: ingredientError } = (await this.supabase
        .from('cake_ingredients')
        .insert(ingredient as never)
        .select()
        .single()) as { data: CakeIngredient; error: null } | { data: null; error: unknown }

      if (ingredientError) throw ingredientError

      // Create splits
      const splitsWithId = splits.map(split => ({
        ...split,
        ingredient_id: newIngredient!.id,
      }))

      const { error: splitsError } = await this.supabase
        .from('ingredient_splits')
        .insert(splitsWithId as never)

      if (splitsError) throw splitsError

      return { data: newIngredient, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateIngredient(
    ingredientId: string,
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

  async deleteIngredient(ingredientId: string): Promise<{ error: Error | null }> {
    try {
      // Delete splits first (cascading delete might handle this)
      await this.supabase
        .from('ingredient_splits')
        .delete()
        .eq('ingredient_id', ingredientId)

      // Delete ingredient
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

  async updateSplits(
    ingredientId: string,
    splits: Omit<InsertIngredientSplit, 'ingredient_id'>[]
  ): Promise<{ error: Error | null }> {
    try {
      // Delete existing splits
      await this.supabase
        .from('ingredient_splits')
        .delete()
        .eq('ingredient_id', ingredientId)

      // Create new splits
      const splitsWithId = splits.map(split => ({
        ...split,
        ingredient_id: ingredientId,
      }))

      const { error } = await this.supabase
        .from('ingredient_splits')
        .insert(splitsWithId as never)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async getIngredientSplits(ingredientId: string): Promise<{ data: (IngredientSplit & { users: User })[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('ingredient_splits')
        .select(`
          *,
          users(*)
        `)
        .eq('ingredient_id', ingredientId)

      if (error) throw error
      return { data: data as (IngredientSplit & { users: User })[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}
