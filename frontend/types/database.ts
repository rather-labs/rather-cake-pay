export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          wallet_address: string
          username: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          wallet_address: string
          username: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          wallet_address?: string
          username?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cakes: {
        Row: {
          id: number
          name: string
          description: string | null
          icon_index: number | null
          token: string
          interest_rate: number
          last_cut_at: number | null
          last_added_ingredient: number | null
          member_ids: number[] | null
          current_balances: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          icon_index?: number | null
          token?: string
          interest_rate?: number
          last_cut_at?: number | null
          last_added_ingredient?: number | null
          member_ids?: number[] | null
          current_balances?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          icon_index?: number | null
          token?: string
          interest_rate?: number
          last_cut_at?: number | null
          last_added_ingredient?: number | null
          member_ids?: number[] | null
          current_balances?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      cake_ingredients: {
        Row: {
          id: number
          batched_ingredients_id: string | null
          cake_id: number
          name: string
          description: string | null
          weights: number[] | null
          payer_ids: number[] | null
          amounts: string[] | null
          receipt_url: string | null
          status: 'pending' | 'submitted' | 'settled'
          created_at: string
          submitted_at: string | null
          settled_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          batched_ingredients_id?: string | null
          cake_id: number
          name: string
          description?: string | null
          weights?: number[] | null
          payer_ids?: number[] | null
          amounts?: string[] | null
          receipt_url?: string | null
          status?: 'pending' | 'submitted' | 'settled'
          created_at?: string
          submitted_at?: string | null
          settled_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          batched_ingredients_id?: string | null
          cake_id?: number
          name?: string
          description?: string | null
          weights?: number[] | null
          payer_ids?: number[] | null
          amounts?: string[] | null
          receipt_url?: string | null
          status?: 'pending' | 'submitted' | 'settled'
          created_at?: string
          submitted_at?: string | null
          settled_at?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type Cake = Database['public']['Tables']['cakes']['Row']
export type CakeIngredient = Database['public']['Tables']['cake_ingredients']['Row']

export type InsertUser = Database['public']['Tables']['users']['Insert']
export type InsertCake = Database['public']['Tables']['cakes']['Insert']
export type InsertCakeIngredient = Database['public']['Tables']['cake_ingredients']['Insert']

export type UpdateUser = Database['public']['Tables']['users']['Update']
export type UpdateCake = Database['public']['Tables']['cakes']['Update']
export type UpdateCakeIngredient = Database['public']['Tables']['cake_ingredients']['Update']
