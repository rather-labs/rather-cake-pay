import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { IngredientsAPI } from './ingredients'

export interface UserBalance {
  userId: number
  totalPaid: number
  totalOwed: number
  balance: number // positive means they are owed, negative means they owe
}

export interface DebtRelationship {
  fromUserId: number
  toUserId: number
  amount: number
}

export class BalancesAPI {
  private ingredientsAPI: IngredientsAPI

  constructor(private supabase: SupabaseClient<Database>) {
    this.ingredientsAPI = new IngredientsAPI(supabase)
  }

  async calculateCakeBalances(cakeId: number): Promise<{ data: Map<number, UserBalance> | null; error: Error | null }> {
    try {
      // Get all ingredients for the cake
      const { data: ingredients, error: ingredientsError } = await this.ingredientsAPI.getCakeIngredients(cakeId)
      if (ingredientsError) throw ingredientsError
      if (!ingredients) return { data: new Map(), error: null }

      // Initialize balances map
      const balances = new Map<number, UserBalance>()

      // Calculate from ingredients
      for (const ingredient of ingredients) {
        // Process payers - each payer paid an amount
        if (ingredient.payer_ids && ingredient.amounts) {
          for (let index = 0; index < ingredient.payer_ids.length; index++) {
            const payerId = ingredient.payer_ids[index]
            const amountPaid = Number.parseFloat(ingredient.amounts[index] || '0')

            // Initialize payer balance if needed
            if (!balances.has(payerId)) {
              balances.set(payerId, {
                userId: payerId,
                totalPaid: 0,
                totalOwed: 0,
                balance: 0,
              })
            }

            // Add to total paid
            const payerBalance = balances.get(payerId)
            if (payerBalance) {
              payerBalance.totalPaid += amountPaid
            }
          }
        }

        // Process weights to calculate who owes what
        // Total amount is sum of all amounts paid
        const totalAmount = ingredient.amounts?.reduce((sum, amt) => sum + Number.parseFloat(amt || '0'), 0) || 0
        const totalWeight = ingredient.weights?.reduce((sum, w) => sum + w, 0) || 0

        if (totalWeight > 0 && ingredient.weights) {
          // Calculate each member's share based on weights
          // Note: Without member_ids mapping, we can't directly calculate owed amounts
          // This would need to be calculated at a higher level where we have cake data
          for (const weight of ingredient.weights) {
            // This is a placeholder - actual calculation needs member_ids from cake
            void weight
            void totalAmount
            void totalWeight
          }
        }
      }

      // Calculate final balances
      for (const balance of balances.values()) {
        balance.balance = balance.totalPaid - balance.totalOwed
      }

      return { data: balances, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async calculateCakeBalancesWithCake(
    cakeId: number,
    memberIds: number[]
  ): Promise<{ data: Map<number, UserBalance> | null; error: Error | null }> {
    try {
      // Get only non-settled ingredients (pending + submitted)
      // Settled expenses are already reflected in on-chain balances
      const { data: ingredients, error: ingredientsError } = await this.ingredientsAPI.getNonSettledIngredients(cakeId)
      if (ingredientsError) throw ingredientsError
      if (!ingredients) return { data: new Map(), error: null }

      // Initialize balances map for all members
      const balances = new Map<number, UserBalance>()
      for (const memberId of memberIds) {
        balances.set(memberId, {
          userId: memberId,
          totalPaid: 0,
          totalOwed: 0,
          balance: 0,
        })
      }

      // Calculate from ingredients
      for (const ingredient of ingredients) {
        // Process payers - each payer paid an amount
        if (ingredient.payer_ids && ingredient.amounts) {
          for (let index = 0; index < ingredient.payer_ids.length; index++) {
            const payerId = ingredient.payer_ids[index]
            const amountPaid = Number.parseFloat(ingredient.amounts[index] || '0')

            const payerBalance = balances.get(payerId)
            if (payerBalance) {
              payerBalance.totalPaid += amountPaid
            }
          }
        }

        // Process weights to calculate who owes what
        const totalAmount = ingredient.amounts?.reduce((sum, amt) => sum + Number.parseFloat(amt || '0'), 0) || 0
        const totalWeight = ingredient.weights?.reduce((sum, w) => sum + w, 0) || 0

        if (totalWeight > 0 && ingredient.weights && ingredient.weights.length === memberIds.length) {
          // Calculate each member's share based on weights
          for (let index = 0; index < ingredient.weights.length; index++) {
            if (index < memberIds.length) {
              const weight = ingredient.weights[index]
              const memberId = memberIds[index]
              const share = (weight / totalWeight) * totalAmount

              const memberBalance = balances.get(memberId)
              if (memberBalance) {
                memberBalance.totalOwed += share
              }
            }
          }
        }
      }

      // Calculate final balances
      for (const balance of balances.values()) {
        balance.balance = balance.totalPaid - balance.totalOwed
      }

      return { data: balances, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async calculateDebtRelationships(
    cakeId: number,
    memberIds: number[]
  ): Promise<{ data: DebtRelationship[] | null; error: Error | null }> {
    try {
      // Get balances first
      const { data: balances, error: balancesError } = await this.calculateCakeBalancesWithCake(cakeId, memberIds)
      if (balancesError) throw balancesError
      if (!balances) return { data: [], error: null }

      // Convert balances to debt relationships
      const debtRelationships: DebtRelationship[] = []
      const creditors: Array<{ userId: number; amount: number }> = []
      const debtors: Array<{ userId: number; amount: number }> = []

      for (const [userId, balance] of balances) {
        if (balance.balance > 0) {
          creditors.push({ userId, amount: balance.balance })
        } else if (balance.balance < 0) {
          debtors.push({ userId, amount: Math.abs(balance.balance) })
        }
      }

      // Simple debt settlement: match creditors with debtors
      let creditorIndex = 0
      let debtorIndex = 0

      while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
        const creditor = creditors[creditorIndex]
        const debtor = debtors[debtorIndex]

        const settlementAmount = Math.min(creditor.amount, debtor.amount)

        debtRelationships.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amount: settlementAmount,
        })

        creditor.amount -= settlementAmount
        debtor.amount -= settlementAmount

        if (creditor.amount === 0) creditorIndex++
        if (debtor.amount === 0) debtorIndex++
      }

      return { data: debtRelationships, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUserBalanceInCake(
    cakeId: number,
    userId: number,
    memberIds: number[]
  ): Promise<{ data: UserBalance | null; error: Error | null }> {
    try {
      const { data: balances, error } = await this.calculateCakeBalancesWithCake(cakeId, memberIds)
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
