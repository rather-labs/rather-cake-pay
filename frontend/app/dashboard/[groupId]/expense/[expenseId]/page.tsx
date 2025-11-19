'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Users, DollarSign, Calendar, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { createClient } from '@/lib/supabase/client'
import { CakesAPI } from '@/lib/api/cakes'
import { IngredientsAPI } from '@/lib/api/ingredients'
import { UsersAPI } from '@/lib/api/users'
import { useCurrentUser } from '@/hooks/use-current-user'
import { ICON_OPTIONS } from '@/lib/constants'
import type { Cake, CakeIngredient, User } from '@/types/database'

type ParticipantWithWeight = {
  user: User
  weight: number
  share: number
  isPayer: boolean
  paidAmount: number
}

export default function ExpenseDetailPage({ params }: { params: { groupId: string; expenseId: string } }) {
  const { groupId, expenseId } = params
  const { user: currentUser } = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cake, setCake] = useState<Cake | null>(null)
  const [expense, setExpense] = useState<CakeIngredient | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithWeight[]>([])
  const [payers, setPayers] = useState<Array<{ user: User; amount: number }>>([])

  useEffect(() => {
    async function fetchExpenseData() {
      try {
        setLoading(true)
        setError(null)

        const cakeId = Number.parseInt(groupId, 10)
        const expenseIdNum = Number.parseInt(expenseId, 10)
        if (Number.isNaN(cakeId) || Number.isNaN(expenseIdNum)) {
          setError('Invalid cake or expense ID')
          return
        }

        const supabase = createClient()
        const cakesAPI = new CakesAPI(supabase)
        const ingredientsAPI = new IngredientsAPI(supabase)
        const usersAPI = new UsersAPI(supabase)

        // Fetch cake
        const { data: cakeData, error: cakeError } = await cakesAPI.getCake(cakeId)
        if (cakeError || !cakeData) {
          setError(cakeError?.message || 'Cake not found')
          return
        }
        setCake(cakeData)

        // Check if current user is a member
        if (currentUser) {
          const userIsMember = cakeData.member_ids?.includes(currentUser.id) ?? false
          if (!userIsMember) {
            setError('You are not a member of this cake')
            return
          }
        }

        // Fetch expense
        const { data: expenseData, error: expenseError } = await ingredientsAPI.getIngredient(expenseIdNum)
        if (expenseError || !expenseData) {
          setError(expenseError?.message || 'Expense not found')
          return
        }

        // Verify expense belongs to this cake
        if (expenseData.cake_id !== cakeId) {
          setError('Expense does not belong to this cake')
          return
        }

        setExpense(expenseData)

        // Calculate total amount
        const amounts = expenseData.amounts || []
        const totalAmount = amounts.reduce((sum, amt) => sum + Number.parseFloat(amt || '0'), 0)

        // Fetch payers
        const payerData: Array<{ user: User; amount: number }> = []
        if (expenseData.payer_ids && expenseData.payer_ids.length > 0) {
          for (let i = 0; i < expenseData.payer_ids.length; i++) {
            const payerId = expenseData.payer_ids[i]
            const { data: payerUser } = await usersAPI.getUser(payerId)
            if (payerUser) {
              payerData.push({
                user: payerUser,
                amount: Number.parseFloat(amounts[i] || '0')
              })
            }
          }
        }
        setPayers(payerData)

        // Calculate participants with weights and shares
        if (cakeData.member_ids && expenseData.weights) {
          const participantsData: ParticipantWithWeight[] = []
          const totalWeight = expenseData.weights.reduce((sum, w) => sum + (w || 0), 0)

          for (let i = 0; i < cakeData.member_ids.length; i++) {
            const memberId = cakeData.member_ids[i]
            const weight = expenseData.weights[i] || 0

            // Only include members with weight > 0 (participants)
            if (weight > 0) {
              const { data: memberUser } = await usersAPI.getUser(memberId)
              if (memberUser) {
                // Calculate share based on weight
                const share = totalWeight > 0 ? (totalAmount * weight) / totalWeight : 0

                // Check if this member is a payer
                const isPayer = expenseData.payer_ids?.includes(memberId) ?? false
                let paidAmount = 0
                if (isPayer && expenseData.payer_ids) {
                  const payerIndex = expenseData.payer_ids.indexOf(memberId)
                  paidAmount = Number.parseFloat(amounts[payerIndex] || '0')
                }

                participantsData.push({
                  user: memberUser,
                  weight,
                  share,
                  isPayer,
                  paidAmount
                })
              }
            }
          }

          setParticipants(participantsData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load expense data')
      } finally {
        setLoading(false)
      }
    }

    fetchExpenseData()
  }, [groupId, expenseId, currentUser])

  const getIconFromIndex = (index: number | null) => {
    if (index === null || index < 0 || index >= ICON_OPTIONS.length) {
      return ICON_OPTIONS[0]
    }
    return ICON_OPTIONS[index]
  }

  // Check if custom weights were used (not all weights are equal to 1)
  const usesCustomWeights = expense?.weights && participants.length > 0
    ? !participants.every(p => p.weight === 1)
    : false

  const totalAmount = expense?.amounts?.reduce((sum, amt) => sum + Number.parseFloat(amt || '0'), 0) || 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] via-[#F0F9F4] to-[#FFF9E5]">
        <header className="border-b-4 border-[#FFB6D9] bg-white/80 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-12 h-12 bg-[#FF69B4] pixel-art-shadow flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🍰
                </div>
                <span className="text-2xl font-bold pixel-text text-[#FF69B4]">CakePay</span>
              </Link>
              <ConnectButton />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#FF69B4] animate-spin mx-auto mb-4" />
            <div className="text-xl font-bold pixel-text text-[#2D3748]">Loading expense...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !expense || !cake) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] via-[#F0F9F4] to-[#FFF9E5]">
        <header className="border-b-4 border-[#FFB6D9] bg-white/80 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-12 h-12 bg-[#FF69B4] pixel-art-shadow flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🍰
                </div>
                <span className="text-2xl font-bold pixel-text text-[#FF69B4]">CakePay</span>
              </Link>
              <ConnectButton />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#FF6B6B]">
            <div className="text-center">
              <div className="text-4xl mb-4">😞</div>
              <div className="text-xl font-bold pixel-text text-[#2D3748] mb-2">Error loading expense</div>
              <div className="text-sm text-[#4A5568] mb-4">{error || 'Expense not found'}</div>
              <Link href={`/dashboard/${groupId}`}>
                <Button className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Cake
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const cakeIcon = getIconFromIndex(cake.icon_index)

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
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link href={`/dashboard/${groupId}`}>
          <Button variant="ghost" className="mb-6 pixel-button hover:bg-[#FFB6D9]/20">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {cake.name}
          </Button>
        </Link>

        {/* Expense Header */}
        <Card className="p-6 mb-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#FFB6D9]">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-3xl flex-shrink-0">
              🥧
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold pixel-text text-[#2D3748] mb-2">{expense.name}</h1>
              {expense.description && (
                <p className="text-sm text-[#4A5568] mb-4">{expense.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-[#4A5568]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(expense.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                {expense.status && (
                  <span className={`px-3 py-1 rounded text-xs font-bold ${
                    expense.status === 'settled' ? 'bg-[#5DD39E]/20 text-[#5DD39E]' :
                    expense.status === 'submitted' ? 'bg-[#FFD700]/20 text-[#FFA500]' :
                    'bg-[#E9D5FF]/20 text-[#4A5568]'
                  }`}>
                    {expense.status.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#4A5568] mb-1">Total Amount</div>
              <div className="text-3xl font-bold pixel-text text-[#FF69B4]">
                ${totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </Card>

        {/* Payers Section */}
        <Card className="p-6 mb-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#FFB6D9]">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-[#FF69B4]" />
            <h2 className="text-xl font-bold pixel-text text-[#2D3748]">Paid By</h2>
          </div>
          
          {payers.length === 0 ? (
            <div className="text-center text-sm text-[#718096] py-4">
              No payers recorded
            </div>
          ) : (
            <div className="space-y-3">
              {payers.map((payer) => (
                <div 
                  key={payer.user.id}
                  className="flex items-center justify-between p-3 bg-[#FFB6D9]/10 rounded border-2 border-[#FFB6D9]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-lg">
                      {payer.user.avatar_url ? (
                        <img src={payer.user.avatar_url} alt={payer.user.username} className="w-full h-full rounded" />
                      ) : (
                        <span>{payer.user.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold pixel-text text-[#2D3748]">{payer.user.username}</div>
                      <div className="text-xs text-[#4A5568]">{payer.user.wallet_address}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold pixel-text text-[#FF69B4]">
                      ${payer.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Participants Section */}
        <Card className="p-6 mb-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#B4E7CE]">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#5DD39E]" />
            <h2 className="text-xl font-bold pixel-text text-[#2D3748]">Split Between</h2>
            {usesCustomWeights && (
              <span className="ml-auto px-2 py-1 bg-[#E9D5FF]/20 text-[#4A5568] text-xs rounded">
                Custom Weights
              </span>
            )}
          </div>
          
          {participants.length === 0 ? (
            <div className="text-center text-sm text-[#718096] py-4">
              No participants
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant) => {
                const netAmount = participant.share - participant.paidAmount
                return (
                  <div 
                    key={participant.user.id}
                    className="flex items-center justify-between p-3 bg-[#B4E7CE]/10 rounded border-2 border-[#B4E7CE]"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-lg">
                        {participant.user.avatar_url ? (
                          <img src={participant.user.avatar_url} alt={participant.user.username} className="w-full h-full rounded" />
                        ) : (
                          <span>{participant.user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold pixel-text text-[#2D3748]">{participant.user.username}</span>
                          {participant.isPayer && (
                            <span className="px-2 py-0.5 bg-[#FF69B4]/20 text-[#FF69B4] text-xs rounded font-bold">
                              Paid ${participant.paidAmount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#4A5568] mt-1">
                          {usesCustomWeights && (
                            <span>Weight: {participant.weight} • </span>
                          )}
                          Share: ${participant.share.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold pixel-text ${
                        netAmount > 0 ? 'text-[#FF6B6B]' : netAmount < 0 ? 'text-[#5DD39E]' : 'text-gray-500'
                      }`}>
                        {netAmount > 0 ? '+' : ''}${netAmount.toFixed(2)}
                      </div>
                      <div className={`text-xs ${
                        netAmount > 0 ? 'text-[#FF6B6B]' : netAmount < 0 ? 'text-[#5DD39E]' : 'text-gray-500'
                      }`}>
                        {netAmount > 0 ? 'owes' : netAmount < 0 ? 'gets back' : 'settled'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Summary */}
        <Card className="p-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#E9D5FF]">
          <h3 className="text-lg font-bold pixel-text text-[#2D3748] mb-4">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#4A5568]">Total Amount:</span>
              <span className="font-bold text-[#2D3748]">${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A5568]">Number of Payers:</span>
              <span className="font-bold text-[#2D3748]">{payers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A5568]">Number of Participants:</span>
              <span className="font-bold text-[#2D3748]">{participants.length}</span>
            </div>
            {usesCustomWeights && (
              <div className="flex justify-between">
                <span className="text-[#4A5568]">Total Weight:</span>
                <span className="font-bold text-[#2D3748]">
                  {participants.reduce((sum, p) => sum + p.weight, 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#4A5568]">Status:</span>
              <span className={`font-bold ${
                expense.status === 'settled' ? 'text-[#5DD39E]' :
                expense.status === 'submitted' ? 'text-[#FFA500]' :
                'text-[#4A5568]'
              }`}>
                {expense.status?.toUpperCase() || 'PENDING'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

