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
          id: string
          wallet_address: string
          username: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cakes: {
        Row: {
          id: string
          name: string
          description: string | null
          image_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          image_url?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      cake_members: {
        Row: {
          id: string
          cake_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          cake_id: string
          user_id: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          cake_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
      }
      cake_ingredients: {
        Row: {
          id: string
          cake_id: string
          description: string
          amount: number
          currency: string
          paid_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cake_id: string
          description: string
          amount: number
          currency?: string
          paid_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cake_id?: string
          description?: string
          amount?: number
          currency?: string
          paid_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      ingredient_splits: {
        Row: {
          id: string
          ingredient_id: string
          user_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          user_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          user_id?: string
          amount?: number
          created_at?: string
        }
      }
      settlements: {
        Row: {
          id: string
          cake_id: string
          from_user_id: string
          to_user_id: string
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'cancelled'
          transaction_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cake_id: string
          from_user_id: string
          to_user_id: string
          amount: number
          currency?: string
          status?: 'pending' | 'completed' | 'cancelled'
          transaction_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cake_id?: string
          from_user_id?: string
          to_user_id?: string
          amount?: number
          currency?: string
          status?: 'pending' | 'completed' | 'cancelled'
          transaction_hash?: string | null
          created_at?: string
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
export type CakeMember = Database['public']['Tables']['cake_members']['Row']
export type CakeIngredient = Database['public']['Tables']['cake_ingredients']['Row']
export type IngredientSplit = Database['public']['Tables']['ingredient_splits']['Row']
export type Settlement = Database['public']['Tables']['settlements']['Row']

export type InsertUser = Database['public']['Tables']['users']['Insert']
export type InsertCake = Database['public']['Tables']['cakes']['Insert']
export type InsertCakeMember = Database['public']['Tables']['cake_members']['Insert']
export type InsertCakeIngredient = Database['public']['Tables']['cake_ingredients']['Insert']
export type InsertIngredientSplit = Database['public']['Tables']['ingredient_splits']['Insert']
export type InsertSettlement = Database['public']['Tables']['settlements']['Insert']

export type UpdateUser = Database['public']['Tables']['users']['Update']
export type UpdateCake = Database['public']['Tables']['cakes']['Update']
export type UpdateCakeMember = Database['public']['Tables']['cake_members']['Update']
export type UpdateCakeIngredient = Database['public']['Tables']['cake_ingredients']['Update']
export type UpdateIngredientSplit = Database['public']['Tables']['ingredient_splits']['Update']
export type UpdateSettlement = Database['public']['Tables']['settlements']['Update']
