import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { UsersAPI } from './users'
import { CakesAPI } from './cakes'
import { IngredientsAPI } from './ingredients'
import { BalancesAPI } from './balances'

export class CakePayAPI {
  public users: UsersAPI
  public cakes: CakesAPI
  public ingredients: IngredientsAPI
  public balances: BalancesAPI

  constructor(supabase: SupabaseClient<Database>) {
    this.users = new UsersAPI(supabase)
    this.cakes = new CakesAPI(supabase)
    this.ingredients = new IngredientsAPI(supabase)
    this.balances = new BalancesAPI(supabase)
  }
}

// Export individual APIs for direct use if needed
export { UsersAPI } from './users'
export { CakesAPI } from './cakes'
export { IngredientsAPI } from './ingredients'
export { BalancesAPI } from './balances'

// Export types
export type { CakeWithMembers } from './cakes'
export type { IngredientWithDetails } from './ingredients'
export type { UserBalance, DebtRelationship } from './balances'
