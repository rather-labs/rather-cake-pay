'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { createClient } from '@/lib/supabase/client'
import { CakesAPI } from '@/lib/api/cakes'
import { UsersAPI } from '@/lib/api/users'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { Cake, User } from '@/types/database'

type MemberWithBalance = User & {
  balance: number
}

type SettlementObligation = {
  user: User
  amount: number
}

export default function SettleUpPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params
  const { user: currentUser } = useCurrentUser()
  const [status, setStatus] = useState<'summary' | 'processing' | 'success'>('summary')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cake, setCake] = useState<Cake | null>(null)
  const [usersWhoNeedToPay, setUsersWhoNeedToPay] = useState<MemberWithBalance[]>([])
  const [usersWhoCanClaim, setUsersWhoCanClaim] = useState<MemberWithBalance[]>([])
  const [youOwe, setYouOwe] = useState<SettlementObligation[]>([])
  const [youAreOwed, setYouAreOwed] = useState<SettlementObligation[]>([])
  const [totalOwed, setTotalOwed] = useState(0)
  const [totalOwedToYou, setTotalOwedToYou] = useState(0)

  useEffect(() => {
    async function fetchSettlementData() {
      try {
        setLoading(true)
        setError(null)

        const cakeId = Number.parseInt(groupId, 10)
        if (Number.isNaN(cakeId)) {
          setError('Invalid cake ID')
          return
        }

        if (!currentUser) {
          setError('Please connect your wallet and register')
          return
        }

        const supabase = createClient()
        const cakesAPI = new CakesAPI(supabase)
        const usersAPI = new UsersAPI(supabase)

        // Fetch cake
        const { data: cakeData, error: cakeError } = await cakesAPI.getCake(cakeId)
        if (cakeError || !cakeData) {
          setError(cakeError?.message || 'Cake not found')
          return
        }
        setCake(cakeData)

        // Check if user is a member
        const userIsMember = cakeData.member_ids?.includes(currentUser.id) ?? false
        if (!userIsMember) {
          setError('You are not a member of this cake')
          return
        }

        // Fetch members
        if (cakeData.member_ids && cakeData.member_ids.length > 0) {
          const { data: memberUsers, error: membersError } = await usersAPI.validateUserIds(cakeData.member_ids)
          if (membersError) {
            setError(membersError.message)
            return
          }
          if (memberUsers) {
            // Calculate balances from current_balances array
            // Balance convention: positive = user is owed (can claim), negative = user owes (needs to pay)
            const balances = cakeData.current_balances || []
            const membersWithBalances: MemberWithBalance[] = memberUsers.map((member, index) => ({
              ...member,
              balance: Number.parseFloat(balances[index] || '0')
            }))

            // Separate members by settlement status
            const needToPay = membersWithBalances
              .filter(m => m.balance < 0)
              .sort((a, b) => a.balance - b.balance) // Most negative first
            
            const canClaim = membersWithBalances
              .filter(m => m.balance > 0)
              .sort((a, b) => b.balance - a.balance) // Most positive first
            
            setUsersWhoNeedToPay(needToPay)
            setUsersWhoCanClaim(canClaim)

            // Calculate current user's specific obligations
            const currentUserBalance = membersWithBalances.find(m => m.id === currentUser.id)?.balance || 0
            
            // Users you owe (they have positive balance, you have negative)
            if (currentUserBalance < 0) {
              const oweList: SettlementObligation[] = membersWithBalances
                .filter(m => m.id !== currentUser.id && m.balance > 0)
                .map(m => ({
                  user: m,
                  amount: Math.min(Math.abs(currentUserBalance), m.balance)
                }))
                .sort((a, b) => b.amount - a.amount)
              
              setYouOwe(oweList)
              setTotalOwed(Math.abs(currentUserBalance))
            } else {
              setYouOwe([])
              setTotalOwed(0)
            }

            // Users who owe you (you have positive balance, they have negative)
            if (currentUserBalance > 0) {
              const owedList: SettlementObligation[] = membersWithBalances
                .filter(m => m.id !== currentUser.id && m.balance < 0)
                .map(m => ({
                  user: m,
                  amount: Math.min(currentUserBalance, Math.abs(m.balance))
                }))
                .sort((a, b) => b.amount - a.amount)
              
              setYouAreOwed(owedList)
              setTotalOwedToYou(currentUserBalance)
            } else {
              setYouAreOwed([])
              setTotalOwedToYou(0)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settlement data')
      } finally {
        setLoading(false)
      }
    }

    fetchSettlementData()
  }, [groupId, currentUser])

  const handleConfirmSettlement = () => {
    if (youOwe.length === 0 && youAreOwed.length === 0) {
      return
    }
    
    setStatus('processing')
    
    // TODO: Implement actual blockchain settlement
    // This should:
    // 1. If youOwe.length > 0: Call payCakeSlice on the smart contract
    // 2. If youAreOwed.length > 0: Call claimCakeSlice on the smart contract
    // 3. Wait for transaction confirmation
    // 4. Update balances in database
    
    // Simulate transaction processing
    setTimeout(() => {
      setStatus('success')
    }, 3000)
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
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-12 h-12 text-[#FF69B4] animate-spin mb-4" />
            <p className="text-[#4A5568]">Loading settlement data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#FF6B6B] max-w-md">
              <div className="text-center">
                <div className="text-4xl mb-4">😞</div>
                <div className="text-xl font-bold pixel-text text-[#2D3748] mb-2">Error</div>
                <div className="text-sm text-[#4A5568] mb-4">{error}</div>
                <Link href={`/dashboard/${groupId}`}>
                  <Button className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Group
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        ) : status === 'summary' && (
          <>
            <Link href={`/dashboard/${groupId}`}>
              <Button variant="ghost" className="mb-6 pixel-button hover:bg-[#FFB6D9]/20">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Group
              </Button>
            </Link>

            <div className="text-center mb-8">
              <div className="text-6xl mb-4 animate-bounce">🍰</div>
              <h1 className="text-4xl font-bold pixel-text text-[#2D3748] mb-2">Time to Settle Up!</h1>
              <p className="text-[#4A5568]">Let&apos;s get those balances squared away</p>
            </div>

            {/* Settlement Overview - All Members */}
            {(usersWhoNeedToPay.length > 0 || usersWhoCanClaim.length > 0) && (
              <Card className="p-8 pixel-card backdrop-blur border-4 mb-6 bg-white/80 border-[#FFB6D9]">
                <h2 className="text-2xl font-bold pixel-text text-[#2D3748] mb-6 text-center">Settlement Overview</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Users Who Need to Pay */}
                  {usersWhoNeedToPay.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold pixel-text text-[#FF6B6B] mb-4 flex items-center gap-2">
                        <span>💸</span>
                        Need to Pay ({usersWhoNeedToPay.length})
                      </h3>
                      <div className="space-y-3">
                        {usersWhoNeedToPay.map((member) => (
                          <div
                            key={member.id}
                            className={`bg-[#FF6B6B]/10 border-3 border-[#FF6B6B] rounded p-4 ${
                              member.id === currentUser?.id ? 'ring-4 ring-[#FF6B6B]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-xl">
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.username} className="w-full h-full rounded" />
                                  ) : (
                                    <span>{member.username.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold pixel-text text-[#2D3748]">
                                    {member.username}
                                    {member.id === currentUser?.id && (
                                      <span className="ml-2 text-sm text-[#FF6B6B]">(You)</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-[#4A5568]">Balance</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold pixel-text text-[#FF6B6B]">
                                  ${Math.abs(member.balance).toFixed(2)}
                                </div>
                                <div className="text-xs text-[#4A5568]">to pay</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Users Who Can Claim */}
                  {usersWhoCanClaim.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold pixel-text text-[#5DD39E] mb-4 flex items-center gap-2">
                        <span>💰</span>
                        Can Claim ({usersWhoCanClaim.length})
                      </h3>
                      <div className="space-y-3">
                        {usersWhoCanClaim.map((member) => (
                          <div
                            key={member.id}
                            className={`bg-[#5DD39E]/10 border-3 border-[#5DD39E] rounded p-4 ${
                              member.id === currentUser?.id ? 'ring-4 ring-[#5DD39E]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-xl">
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.username} className="w-full h-full rounded" />
                                  ) : (
                                    <span>{member.username.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold pixel-text text-[#2D3748]">
                                    {member.username}
                                    {member.id === currentUser?.id && (
                                      <span className="ml-2 text-sm text-[#5DD39E]">(You)</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-[#4A5568]">Balance</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold pixel-text text-[#5DD39E]">
                                  ${member.balance.toFixed(2)}
                                </div>
                                <div className="text-xs text-[#4A5568]">to claim</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary Totals */}
                <div className="mt-6 pt-6 border-t-3 border-[#E9D5FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold pixel-text text-[#2D3748]">Total Owed</span>
                    <span className="text-2xl font-bold pixel-text text-[#FF6B6B]">
                      ${usersWhoNeedToPay.reduce((sum, m) => sum + Math.abs(m.balance), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold pixel-text text-[#2D3748]">Total to Claim</span>
                    <span className="text-2xl font-bold pixel-text text-[#5DD39E]">
                      ${usersWhoCanClaim.reduce((sum, m) => sum + m.balance, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* You Owe Section */}
            {youOwe.length > 0 && (
              <Card className={`p-8 pixel-card backdrop-blur border-4 mb-6 ${
                'bg-[#FF6B6B]/10 border-[#FF6B6B]'
              }`}>
                <h2 className="text-xl font-bold pixel-text text-[#2D3748] mb-6">You Need to Pay</h2>
                
                {youOwe.map((obligation) => (
                  <div key={obligation.user.id} className="mb-6">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-2xl">
                          {currentUser?.avatar_url ? (
                            <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full rounded" />
                          ) : (
                            <span>{currentUser?.username.charAt(0).toUpperCase() || '👤'}</span>
                          )}
                        </div>
                        <span className="text-lg font-bold pixel-text">You</span>
                      </div>

                      <div className="flex-1 flex items-center justify-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-[#FF6B6B] animate-pulse" style={{ animationDelay: '0s' }} />
                          <div className="w-3 h-3 bg-[#FF6B6B] animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-3 h-3 bg-[#FF6B6B] animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                        <ArrowRight className="w-6 h-6 text-[#FF6B6B]" />
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-[#FF6B6B] animate-pulse" style={{ animationDelay: '0s' }} />
                          <div className="w-3 h-3 bg-[#FF6B6B] animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-3 h-3 bg-[#FF6B6B] animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-2xl">
                          {obligation.user.avatar_url ? (
                            <img src={obligation.user.avatar_url} alt={obligation.user.username} className="w-full h-full rounded" />
                          ) : (
                            <span>{obligation.user.username.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-lg font-bold pixel-text">{obligation.user.username}</span>
                      </div>
                    </div>

                    <div className="bg-[#FF6B6B]/10 border-3 border-[#FF6B6B] rounded p-4 text-center">
                      <div className="text-sm text-[#4A5568] mb-1">You owe {obligation.user.username}</div>
                      <div className="text-3xl font-bold pixel-text text-[#FF6B6B] mb-2">
                        ${obligation.amount.toFixed(2)}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-[#4A5568]">
                        <div className="w-5 h-5 bg-[#B4E7CE] pixel-art-shadow flex items-center justify-center text-xs">💰</div>
                        <span>Paid in {cake?.token === '0x0000000000000000000000000000000000000000' ? 'native ETH' : 'token'}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-6 border-t-3 border-[#E9D5FF] mt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold pixel-text text-[#2D3748]">Total to Pay</span>
                    <span className="text-3xl font-bold pixel-text text-[#FF6B6B]">
                      ${totalOwed.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* You Are Owed Section */}
            {youAreOwed.length > 0 && (
              <Card className={`p-8 pixel-card backdrop-blur border-4 mb-6 ${
                'bg-[#5DD39E]/10 border-[#5DD39E]'
              }`}>
                <h2 className="text-xl font-bold pixel-text text-[#2D3748] mb-6">You Can Claim</h2>
                
                {youAreOwed.map((obligation) => (
                  <div key={obligation.user.id} className="mb-6">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-2xl">
                          {obligation.user.avatar_url ? (
                            <img src={obligation.user.avatar_url} alt={obligation.user.username} className="w-full h-full rounded" />
                          ) : (
                            <span>{obligation.user.username.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-lg font-bold pixel-text">{obligation.user.username}</span>
                      </div>

                      <div className="flex-1 flex items-center justify-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-[#5DD39E] animate-pulse" style={{ animationDelay: '0s' }} />
                          <div className="w-3 h-3 bg-[#5DD39E] animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-3 h-3 bg-[#5DD39E] animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                        <ArrowRight className="w-6 h-6 text-[#5DD39E]" />
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-[#5DD39E] animate-pulse" style={{ animationDelay: '0s' }} />
                          <div className="w-3 h-3 bg-[#5DD39E] animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-3 h-3 bg-[#5DD39E] animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-2xl">
                          {currentUser?.avatar_url ? (
                            <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full rounded" />
                          ) : (
                            <span>{currentUser?.username.charAt(0).toUpperCase() || '👤'}</span>
                          )}
                        </div>
                        <span className="text-lg font-bold pixel-text">You</span>
                      </div>
                    </div>

                    <div className="bg-[#5DD39E]/10 border-3 border-[#5DD39E] rounded p-4 text-center">
                      <div className="text-sm text-[#4A5568] mb-1">{obligation.user.username} owes you</div>
                      <div className="text-3xl font-bold pixel-text text-[#5DD39E] mb-2">
                        ${obligation.amount.toFixed(2)}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-[#4A5568]">
                        <div className="w-5 h-5 bg-[#B4E7CE] pixel-art-shadow flex items-center justify-center text-xs">💰</div>
                        <span>Claim in {cake?.token === '0x0000000000000000000000000000000000000000' ? 'native ETH' : 'token'}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-6 border-t-3 border-[#E9D5FF] mt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold pixel-text text-[#2D3748]">Total to Claim</span>
                    <span className="text-3xl font-bold pixel-text text-[#5DD39E]">
                      ${totalOwedToYou.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* All Settled */}
            {usersWhoNeedToPay.length === 0 && usersWhoCanClaim.length === 0 && (
              <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#5DD39E] mb-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-2xl font-bold pixel-text text-[#2D3748] mb-2">All Settled!</h2>
                  <p className="text-[#4A5568]">All balances are $0.00. No settlements needed.</p>
                </div>
              </Card>
            )}

            {currentUser && (youOwe.length > 0 || youAreOwed.length > 0) && (
              <Button 
                onClick={handleConfirmSettlement}
                className="w-full bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 py-8 text-2xl"
              >
                <div className="mr-3 text-3xl">🎂</div>
                {youOwe.length > 0 ? 'Pay & Settle' : 'Claim Funds'}
              </Button>
            )}
          </>
        )}

        {/* Processing Screen */}
        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative mb-8">
              <div className="text-8xl animate-spin" style={{ animationDuration: '2s' }}>🍰</div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-8 border-[#FFB6D9] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>

            <h2 className="text-3xl font-bold pixel-text text-[#2D3748] mb-4">Processing your payment...</h2>
            <p className="text-[#4A5568] text-center max-w-md">
              Hang tight! We&apos;re securely processing your settlement.
            </p>

            {/* Pixel Progress Bar */}
            <div className="w-full max-w-md mt-8 bg-white border-4 border-[#FFB6D9] rounded h-8 overflow-hidden pixel-art-shadow">
              <div className="h-full bg-gradient-to-r from-[#FF69B4] to-[#FFB6D9] animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        )}

        {/* Success Screen */}
        {status === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            {/* Celebration Animation */}
            <div className="relative mb-8">
              <div className="text-8xl animate-bounce">🎉</div>
              <div className="absolute -top-4 -left-4 text-4xl animate-ping">✨</div>
              <div className="absolute -top-4 -right-4 text-4xl animate-ping" style={{ animationDelay: '0.2s' }}>⭐</div>
              <div className="absolute -bottom-4 -left-4 text-4xl animate-ping" style={{ animationDelay: '0.4s' }}>🎊</div>
              <div className="absolute -bottom-4 -right-4 text-4xl animate-ping" style={{ animationDelay: '0.6s' }}>💫</div>
            </div>

            <h1 className="text-5xl font-bold pixel-text text-[#5DD39E] mb-4">All Settled!</h1>

            <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#5DD39E] mb-8 w-full max-w-md">
              <div className="text-center">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-[#4A5568] mb-2">You {youOwe.length > 0 ? 'paid' : 'claimed'}</p>
                <p className="text-3xl font-bold pixel-text text-[#2D3748] mb-2">
                  ${(youOwe.length > 0 ? totalOwed : totalOwedToYou).toFixed(2)}
                </p>
                {youOwe.length > 0 && youOwe.length === 1 && (
                  <p className="text-[#4A5568]">to {youOwe[0].user.username}</p>
                )}
                {youAreOwed.length > 0 && youAreOwed.length === 1 && (
                  <p className="text-[#4A5568]">from {youAreOwed[0].user.username}</p>
                )}
              </div>

              <div className="mt-6 pt-6 border-t-3 border-[#E9D5FF]">
                <div className="bg-[#5DD39E]/10 border-3 border-[#5DD39E] rounded p-4 text-center">
                  <div className="text-lg font-bold pixel-text text-[#5DD39E] mb-2">
                    You&apos;re all caught up! 🎊
                  </div>
                  <p className="text-sm text-[#4A5568]">Your balance is now $0.00</p>
                </div>
              </div>

              {/* Leaderboard Badge */}
              <div className="mt-6 bg-gradient-to-r from-[#FFB6D9]/20 to-[#E9D5FF]/20 border-3 border-[#FFB6D9] rounded p-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-4xl">🥇</div>
                  <div>
                    <div className="font-bold pixel-text text-[#FF69B4]">Top Payer Badge Earned!</div>
                    <div className="text-xs text-[#4A5568]">You&apos;re #1 on the leaderboard</div>
                  </div>
                </div>
              </div>
            </Card>

            <Link href={`/dashboard/${groupId}`} className="w-full max-w-md">
              <Button className="w-full bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 py-6 text-xl">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Group
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
