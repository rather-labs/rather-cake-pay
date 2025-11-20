/**
 * Mock and Test Data
 * 
 * This file contains all mock data and test constants used throughout the frontend.
 * In production, this data should be replaced with real API calls to Supabase.
 */

// ============================================================================
// Test User Constants
// ============================================================================
// Temporary test user ID - will be replaced with real wallet auth
// This user should exist in your Supabase database
// TODO: After running the SQL script in scripts/create-test-user.sql,
// replace this with the actual user ID from Supabase
export const TEST_USER_ID = '1' 
export const TEST_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2'
export const TEST_USERNAME = 'cryptowhale_42'

// ============================================================================
// Mock Group Data
// ============================================================================
export interface MockMember {
  id: string
  name: string
  avatar: string
  balance: number
}

export interface MockGroup {
  id: string
  name: string
  icon: string
  totalExpenses: number
  yourBalance: number
  members: MockMember[]
}

export const getMockGroup = (groupId: string): MockGroup => ({
  id: groupId,
  name: 'Weekend Trip',
  icon: '🏖️',
  totalExpenses: 1250.50,
  yourBalance: 125.75,
  members: [
    { id: '1', name: 'You', avatar: '👤', balance: 125.75 },
    { id: '2', name: 'Sarah', avatar: '👩', balance: 245.50 },
    { id: '3', name: 'Mike', avatar: '👨', balance: -85.30 },
    { id: '4', name: 'Alex', avatar: '🧑', balance: -143.13 }
  ]
})

// ============================================================================
// Mock Expense Data
// ============================================================================
export interface MockExpense {
  id: number
  description: string
  amount: number
  category: 'food' | 'transport' | 'accommodation' | 'shopping'
  paidBy: string
  splitBetween: string[]
  yourShare: number
  date: string
}

export const MOCK_EXPENSES: MockExpense[] = [
  {
    id: 1,
    description: 'Beach Resort Dinner',
    amount: 245.50,
    category: 'food',
    paidBy: 'Sarah',
    splitBetween: ['You', 'Sarah', 'Mike', 'Alex'],
    yourShare: -61.38,
    date: '2024-01-15'
  },
  {
    id: 2,
    description: 'Gas for Road Trip',
    amount: 85.00,
    category: 'transport',
    paidBy: 'You',
    splitBetween: ['You', 'Sarah', 'Mike', 'Alex'],
    yourShare: 63.75,
    date: '2024-01-14'
  },
  {
    id: 3,
    description: 'Airbnb Stay',
    amount: 680.00,
    category: 'accommodation',
    paidBy: 'Mike',
    splitBetween: ['You', 'Sarah', 'Mike', 'Alex'],
    yourShare: -170.00,
    date: '2024-01-13'
  },
  {
    id: 4,
    description: 'Grocery Shopping',
    amount: 125.50,
    category: 'shopping',
    paidBy: 'You',
    splitBetween: ['You', 'Sarah', 'Mike'],
    yourShare: 83.67,
    date: '2024-01-13'
  },
  {
    id: 5,
    description: 'Pizza Night',
    amount: 114.50,
    category: 'food',
    paidBy: 'Alex',
    splitBetween: ['You', 'Sarah', 'Mike', 'Alex'],
    yourShare: -28.63,
    date: '2024-01-12'
  }
]

// ============================================================================
// Mock Settlement Data
// ============================================================================
export interface MockSettlementPerson {
  name: string
  avatar: string
  amount: number
}

export interface MockSettlement {
  youOwe: MockSettlementPerson[]
  totalAmount: number
}

export const MOCK_SETTLEMENT: MockSettlement = {
  youOwe: [
    { name: 'Alice', avatar: '👩', amount: 45.00 }
  ],
  totalAmount: 45.00
}

// ============================================================================
// Mock Icon Options
// ============================================================================
// Re-export from constants for backward compatibility
export { ICON_OPTIONS } from './constants'

