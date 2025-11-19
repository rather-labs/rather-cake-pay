'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Plus, Users, Calendar, Utensils, Car, Home, ShoppingBag, X, Trophy, Medal, Award } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function GroupDetailPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splitBetween: [] as string[],
    splitEqually: true,
    date: new Date().toISOString().split('T')[0]
  })

  // Mock group data
  const group = {
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
  }

  const leaderboard = [...group.members]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3)

  const expenses = [
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return <Utensils className="w-5 h-5" />
      case 'transport': return <Car className="w-5 h-5" />
      case 'accommodation': return <Home className="w-5 h-5" />
      case 'shopping': return <ShoppingBag className="w-5 h-5" />
      default: return <Utensils className="w-5 h-5" />
    }
  }

  const handleAddExpense = () => {
    console.log('[v0] Adding expense:', newExpense)
    setIsAddExpenseOpen(false)
    setNewExpense({
      description: '',
      amount: '',
      paidBy: '',
      splitBetween: [],
      splitEqually: true,
      date: new Date().toISOString().split('T')[0]
    })
  }

  const toggleMember = (memberId: string) => {
    setNewExpense(prev => ({
      ...prev,
      splitBetween: prev.splitBetween.includes(memberId)
        ? prev.splitBetween.filter(id => id !== memberId)
        : [...prev.splitBetween, memberId]
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] via-[#F0F9F4] to-[#FFF9E5]">
      {/* Header */}
      <header className="border-b-4 border-[#FFB6D9] bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-[#FF69B4] pixel-art-shadow flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🍰
              </div>
              <span className="text-2xl font-bold pixel-text text-[#FF69B4]">CakePay</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" className="pixel-button border-2 border-[#B4E7CE]">
                Connect Wallet
              </Button>
              <div className="w-10 h-10 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-xl cursor-pointer hover:scale-110 transition-transform">
                👤
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Back Button */}
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-6 pixel-button hover:bg-[#FFB6D9]/20">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Button>
            </Link>

            {/* Group Header */}
            <Card className="p-6 mb-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#FFB6D9]">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-4xl flex-shrink-0">
                    {group.icon}
                  </div>
                  
                  <div>
                    <h1 className="text-3xl font-bold pixel-text text-[#2D3748] mb-2">{group.name}</h1>
                    <div className="flex items-center gap-2 text-[#4A5568]">
                      <Users className="w-4 h-4" />
                      <span>{group.members.length} members</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-[#4A5568] mb-1">Total Expenses</div>
                  <div className="text-3xl font-bold pixel-text text-[#FF69B4]">
                    ${group.totalExpenses.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Member Avatars */}
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                {group.members.map((member) => (
                  <div key={member.id} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-2xl hover:scale-110 transition-transform cursor-pointer">
                      {member.avatar}
                    </div>
                    <span className="text-xs text-[#4A5568]">{member.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Balance Section */}
            <Card className={`p-6 mb-6 pixel-card backdrop-blur border-4 ${
              group.yourBalance > 0 
                ? 'bg-[#5DD39E]/10 border-[#5DD39E]' 
                : group.yourBalance < 0 
                ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]'
                : 'bg-gray-100 border-gray-300'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-[#4A5568] mb-2">Your Balance</div>
                  <div className={`text-4xl font-bold pixel-text ${
                    group.yourBalance > 0 
                      ? 'text-[#5DD39E]' 
                      : group.yourBalance < 0 
                      ? 'text-[#FF6B6B]'
                      : 'text-gray-500'
                  }`}>
                    {group.yourBalance > 0 ? '+' : ''}${Math.abs(group.yourBalance).toFixed(2)}
                  </div>
                  <div className={`text-sm mt-1 ${
                    group.yourBalance > 0 
                      ? 'text-[#5DD39E]' 
                      : group.yourBalance < 0 
                      ? 'text-[#FF6B6B]'
                      : 'text-gray-500'
                  }`}>
                    {group.yourBalance > 0 
                      ? 'You are owed' 
                      : group.yourBalance < 0 
                      ? 'You owe'
                      : 'All settled up'}
                  </div>
                </div>

                {group.yourBalance !== 0 && (
                  <Link href={`/dashboard/${groupId}/settle`}>
                    <Button className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                      <div className="mr-2 text-xl">🍰</div>
                      Settle Up
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            {/* Expense List */}
            <div className="mb-24">
              <h2 className="text-2xl font-bold pixel-text text-[#2D3748] mb-4">Expenses</h2>
              
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card 
                    key={expense.id}
                    className="p-4 pixel-card bg-white/80 backdrop-blur border-3 border-[#E9D5FF] hover:border-[#FFB6D9] transition-all cursor-pointer hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-[#FF69B4] flex-shrink-0">
                        {getCategoryIcon(expense.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold pixel-text text-[#2D3748] mb-1">{expense.description}</h3>
                        <div className="text-sm text-[#4A5568] flex items-center gap-3 flex-wrap">
                          <span>{expense.paidBy} paid ${expense.amount.toFixed(2)}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-xs text-[#718096] mt-1">
                          Split between {expense.splitBetween.length} people
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`text-xl font-bold pixel-text ${
                          expense.yourShare > 0 ? 'text-[#5DD39E]' : 'text-[#FF6B6B]'
                        }`}>
                          {expense.yourShare > 0 ? '+' : ''}${Math.abs(expense.yourShare).toFixed(2)}
                        </div>
                        <div className={`text-xs ${
                          expense.yourShare > 0 ? 'text-[#5DD39E]' : 'text-[#FF6B6B]'
                        }`}>
                          {expense.yourShare > 0 ? 'You get back' : 'You owe'}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#E9D5FF] sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold pixel-text text-[#2D3748]">Top Balances</h2>
              </div>

              <div className="space-y-4">
                {leaderboard.map((member, index) => (
                  <div 
                    key={member.id}
                    className={`flex items-center gap-3 p-4 rounded-lg pixel-art-shadow transition-all hover:-translate-y-1 cursor-pointer
                      ${index === 0 ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border-2 border-[#FFD700]' : 
                        index === 1 ? 'bg-gradient-to-r from-[#C0C0C0]/20 to-[#A8A8A8]/20 border-2 border-[#C0C0C0]' : 
                        'bg-gradient-to-r from-[#CD7F32]/20 to-[#B8860B]/20 border-2 border-[#CD7F32]'}`}
                  >
                    <div className="flex-shrink-0">
                      {index === 0 && <Trophy className="w-6 h-6 text-[#FFD700]" />}
                      {index === 1 && <Medal className="w-6 h-6 text-[#C0C0C0]" />}
                      {index === 2 && <Award className="w-6 h-6 text-[#CD7F32]" />}
                    </div>
                    
                    <div className="w-12 h-12 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-2xl">
                      {member.avatar}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-bold pixel-text text-[#2D3748]">{member.name}</div>
                      <div className={`text-sm ${member.balance >= 0 ? 'text-[#5DD39E]' : 'text-[#FF6B6B]'}`}>
                        {member.balance >= 0 ? '+' : ''}${member.balance.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="text-2xl font-bold pixel-text text-[#FF69B4]">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t-2 border-[#E9D5FF]">
                <div className="text-xs text-center text-[#718096]">
                  Balances show who has paid the most in this group 🎯
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3">
          <Link href={`/dashboard/${groupId}/settle`}>
            <Button className="bg-[#B4E7CE] hover:bg-[#5DD39E] text-[#2D3748] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              Settle Debts
            </Button>
          </Link>
          
          <Button 
            onClick={() => setIsAddExpenseOpen(true)}
            className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-lg px-6 py-6"
          >
            <Plus className="w-6 h-6 mr-2" />
            <div className="mr-2 text-2xl">🥧</div>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto pixel-card bg-white border-4 border-[#FF69B4]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold pixel-text text-[#2D3748]">Add Expense</h2>
                <button 
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#FFB6D9]/20 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-[#4A5568]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="What was this expense for?"
                    className="w-full px-4 py-3 border-3 border-[#E9D5FF] rounded pixel-art-shadow focus:border-[#FF69B4] outline-none transition-colors"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A5568] font-bold">$</span>
                    <input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border-3 border-[#E9D5FF] rounded pixel-art-shadow focus:border-[#FF69B4] outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Paid By */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Paid by
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {group.members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setNewExpense({ ...newExpense, paidBy: member.id })}
                        className={`p-3 border-3 rounded pixel-art-shadow transition-all hover:-translate-y-1 ${
                          newExpense.paidBy === member.id
                            ? 'border-[#FF69B4] bg-[#FFB6D9]/20'
                            : 'border-[#E9D5FF] bg-white hover:border-[#FFB6D9]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-lg">
                            {member.avatar}
                          </div>
                          <span className="font-bold pixel-text text-sm">{member.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Between */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Split between
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {group.members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => toggleMember(member.id)}
                        className={`p-3 border-3 rounded pixel-art-shadow transition-all hover:-translate-y-1 ${
                          newExpense.splitBetween.includes(member.id)
                            ? 'border-[#B4E7CE] bg-[#B4E7CE]/20'
                            : 'border-[#E9D5FF] bg-white hover:border-[#B4E7CE]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                            newExpense.splitBetween.includes(member.id)
                              ? 'border-[#5DD39E] bg-[#5DD39E]'
                              : 'border-[#E9D5FF]'
                          }`}>
                            {newExpense.splitBetween.includes(member.id) && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <div className="w-8 h-8 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-lg">
                            {member.avatar}
                          </div>
                          <span className="font-bold pixel-text text-sm">{member.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExpense.splitEqually}
                      onChange={(e) => setNewExpense({ ...newExpense, splitEqually: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-[#4A5568]">Split equally</span>
                  </label>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="w-full px-4 py-3 border-3 border-[#E9D5FF] rounded pixel-art-shadow focus:border-[#FF69B4] outline-none transition-colors"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  onClick={handleAddExpense}
                  disabled={!newExpense.description || !newExpense.amount || !newExpense.paidBy || newExpense.splitBetween.length === 0}
                  className="w-full bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Expense
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
