import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { IngredientsAPI, IngredientWithSplits } from './ingredients'
import { SettlementsAPI, SettlementWithUsers } from './settlements'

export interface UserBalance {
  userId: string
  totalPaid: number
  totalOwed: number
  balance: number // positive means they are owed, negative means they owe
}

export interface DebtRelationship {
  fromUserId: string
  toUserId: string
  amount: number
}

export class BalancesAPI {
  private ingredientsAPI: IngredientsAPI
  private settlementsAPI: SettlementsAPI

  constructor(private supabase: SupabaseClient<Database>) {
    this.ingredientsAPI = new IngredientsAPI(supabase)
    this.settlementsAPI = new SettlementsAPI(supabase)
  }

  async calculateCakeBalances(cakeId: string): Promise<{ data: Map<string, UserBalance> | null; error: Error | null }> {
    try {
      // Get all ingredients for the cake
      const { data: ingredients, error: ingredientsError } = await this.ingredientsAPI.getCakeIngredients(cakeId)
      if (ingredientsError) throw ingredientsError
      if (!ingredients) return { data: new Map(), error: null }

      // Get all settlements for the cake
      const { data: settlements, error: settlementsError } = await this.settlementsAPI.getCakeSettlements(cakeId)
      if (settlementsError) throw settlementsError

      // Initialize balances map
      const balances = new Map<string, UserBalance>()

      // Calculate from ingredients
      ingredients.forEach((ingredient: IngredientWithSplits) => {
        const paidBy = ingredient.paid_by
        const totalAmount = ingredient.amount

        // Initialize payer balance if needed
        if (!balances.has(paidBy)) {
          balances.set(paidBy, {
            userId: paidBy,
            totalPaid: 0,
            totalOwed: 0,
            balance: 0,
          })
        }

        // Add to total paid
        const payerBalance = balances.get(paidBy)!
        payerBalance.totalPaid += totalAmount

        // Process splits
        ingredient.ingredient_splits.forEach(split => {
          // Initialize split user balance if needed
          if (!balances.has(split.user_id)) {
            balances.set(split.user_id, {
              userId: split.user_id,
              totalPaid: 0,
              totalOwed: 0,
              balance: 0,
            })
          }

          // Add to total owed
          const splitUserBalance = balances.get(split.user_id)!
          splitUserBalance.totalOwed += split.amount
        })
      })

      // Apply settlements
      if (settlements) {
        settlements.forEach((settlement: SettlementWithUsers) => {
          if (settlement.status === 'completed') {
            const fromBalance = balances.get(settlement.from_user_id)
            const toBalance = balances.get(settlement.to_user_id)

            if (fromBalance) {
              fromBalance.totalPaid += settlement.amount
            }

            if (toBalance) {
              toBalance.totalOwed -= settlement.amount
            }
          }
        })
      }

      // Calculate final balances
      balances.forEach(balance => {
        balance.balance = balance.totalPaid - balance.totalOwed
      })

      return { data: balances, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async calculateDebtRelationships(cakeId: string): Promise<{ data: DebtRelationship[] | null; error: Error | null }> {
    try {
      // Get all ingredients
      const { data: ingredients, error: ingredientsError } = await this.ingredientsAPI.getCakeIngredients(cakeId)
      if (ingredientsError) throw ingredientsError
      if (!ingredients) return { data: [], error: null }

      // Map to track who owes whom
      const debts = new Map<string, Map<string, number>>()

      // Calculate debts from ingredients
      ingredients.forEach((ingredient: IngredientWithSplits) => {
        const paidBy = ingredient.paid_by

        ingredient.ingredient_splits.forEach(split => {
          const userId = split.user_id

          // Skip if user paid for their own share
          if (userId === paidBy) return

          // Initialize maps if needed
          if (!debts.has(userId)) {
            debts.set(userId, new Map())
          }

          const userDebts = debts.get(userId)!
          const currentDebt = userDebts.get(paidBy) || 0
          userDebts.set(paidBy, currentDebt + split.amount)
        })
      })

      // Convert to array and simplify (net out mutual debts)
      const debtRelationships: DebtRelationship[] = []

      debts.forEach((creditors, debtor) => {
        creditors.forEach((amount, creditor) => {
          // Check if there's a reverse debt to net out
          const reverseDebt = debts.get(creditor)?.get(debtor) || 0

          if (reverseDebt > 0) {
            // Net out the debts
            const netAmount = amount - reverseDebt

            if (netAmount > 0) {
              debtRelationships.push({
                fromUserId: debtor,
                toUserId: creditor,
                amount: netAmount,
              })
            } else if (netAmount < 0) {
              debtRelationships.push({
                fromUserId: creditor,
                toUserId: debtor,
                amount: Math.abs(netAmount),
              })
            }

            // Clear both to avoid double counting
            debts.get(debtor)?.delete(creditor)
            debts.get(creditor)?.delete(debtor)
          } else {
            debtRelationships.push({
              fromUserId: debtor,
              toUserId: creditor,
              amount,
            })
          }
        })
      })

      return { data: debtRelationships, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUserBalanceInCake(cakeId: string, userId: string): Promise<{ data: UserBalance | null; error: Error | null }> {
    try {
      const { data: balances, error } = await this.calculateCakeBalances(cakeId)
      if (error) throw error

      const userBalance = balances?.get(userId) || {
        userId,
        totalPaid: 0,
        totalOwed: 0,
        balance: 0,
      }

      return { data: userBalance, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}
