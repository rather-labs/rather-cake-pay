'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Users, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { createClient } from '@/lib/supabase/client'
import { CakesAPI } from '@/lib/api/cakes'
import { UsersAPI } from '@/lib/api/users'
import { IngredientsAPI } from '@/lib/api/ingredients'
import { useCurrentUser } from '@/hooks/use-current-user'
import { ICON_OPTIONS } from '@/lib/constants'
import type { Cake, User, CakeIngredient } from '@/types/database'

type CakeWithBalance = Cake & {
  userBalance: number
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const { userId } = params
  const { user: currentUser } = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [cakes, setCakes] = useState<CakeWithBalance[]>([])
  
  // Check if viewing own profile
  const isOwnProfile = currentUser && user && currentUser.id === user.id

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true)
        setError(null)

        const userIdNum = Number.parseInt(userId, 10)
        if (Number.isNaN(userIdNum)) {
          setError('Invalid user ID')
          return
        }

        const supabase = createClient()
        const usersAPI = new UsersAPI(supabase)
        const cakesAPI = new CakesAPI(supabase)

        // Fetch user
        const { data: userData, error: userError } = await usersAPI.getUser(userIdNum)
        if (userError || !userData) {
          setError(userError?.message || 'User not found')
          return
        }
        setUser(userData)

        // Fetch user's cakes
        const { data: cakesData, error: cakesError } = await cakesAPI.getUserCakes(userIdNum)
        if (cakesError) {
          console.error('Error fetching cakes:', cakesError)
        } else if (cakesData) {
          // Filter to only show cakes shared with current user (if viewing someone else's profile)
          let filteredCakes = cakesData
          if (currentUser && currentUser.id !== userIdNum) {
            // Only show cakes where both users are members
            filteredCakes = cakesData.filter(cake => 
              cake.member_ids?.includes(currentUser.id) ?? false
            )
          }
          
          // Calculate user balance for each cake (including pending ingredients)
          const ingredientsAPI = new IngredientsAPI(supabase)
          const cakesWithBalances: CakeWithBalance[] = await Promise.all(
            filteredCakes.map(async (cake) => {
              // Find user's index in member_ids
              const memberIndex = cake.member_ids?.indexOf(userIdNum) ?? -1
              // Start with on-chain balance
              let balance = memberIndex >= 0 && cake.current_balances
                ? Number.parseFloat(cake.current_balances[memberIndex] || '0')
                : 0

              // Fetch pending ingredients for this cake
              const { data: pendingIngredients } = await ingredientsAPI.getPendingIngredients(cake.id)
              
              if (pendingIngredients && memberIndex >= 0) {
                for (const ingredient of pendingIngredients) {
                  const amounts = ingredient.amounts || []
                  const totalAmount = amounts.reduce((sum, amt) => sum + Number.parseFloat(amt || '0'), 0)
                  
                  // Calculate user's share based on weights
                  // Balance convention: positive = you are owed, negative = you owe
                  if (ingredient.weights && ingredient.weights[memberIndex] > 0) {
                    const totalWeight = ingredient.weights.reduce((sum, w) => sum + (w || 0), 0)
                    const userWeight = ingredient.weights[memberIndex] || 0
                    if (totalWeight > 0) {
                      const userShare = (totalAmount * userWeight) / totalWeight
                      balance -= userShare // User owes this share (decrease balance, make more negative)
                    }
                  }
                  
                  // Add amount user paid (if user is a payer)
                  if (ingredient.payer_ids && ingredient.payer_ids.includes(userIdNum)) {
                    const payerIndex = ingredient.payer_ids.indexOf(userIdNum)
                    const paidAmount = Number.parseFloat(amounts[payerIndex] || '0')
                    balance += paidAmount // User paid this, so increase balance (make more positive)
                  }
                }
              }

              return {
                ...cake,
                userBalance: balance
              }
            })
          )
          setCakes(cakesWithBalances)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userId, currentUser])

  const getIconFromIndex = (index: number | null) => {
    if (index === null || index < 0 || index >= ICON_OPTIONS.length) {
      return ICON_OPTIONS[0]
    }
    return ICON_OPTIONS[index]
  }

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
            <div className="text-xl font-bold pixel-text text-[#2D3748]">Loading profile...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
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
              <div className="text-xl font-bold pixel-text text-[#2D3748] mb-2">Error loading profile</div>
              <div className="text-sm text-[#4A5568] mb-4">{error || 'User not found'}</div>
              <Link href="/dashboard">
                <Button className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Calculate total balance across all cakes
  const totalBalance = cakes.reduce((sum, cake) => sum + cake.userBalance, 0)

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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6 pixel-button hover:bg-[#FFB6D9]/20">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* User Profile Header */}
        <Card className="p-6 mb-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#FFB6D9]">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-4xl">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded" />
              ) : (
                <span>{user.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold pixel-text text-[#2D3748] mb-2">{user.username}</h1>
              <div className="text-sm text-[#4A5568]">
                <span className="font-mono">{user.wallet_address}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#4A5568] mb-1">Total Balance</div>
              <div className={`text-3xl font-bold pixel-text ${
                totalBalance > 0 
                  ? 'text-[#5DD39E]' 
                  : totalBalance < 0 
                  ? 'text-[#FF6B6B]'
                  : 'text-gray-500'
              }`}>
                {totalBalance > 0 ? '+' : ''}${totalBalance.toFixed(2)}
              </div>
              {isOwnProfile && (
                <div className={`text-xs mt-1 ${
                  totalBalance > 0 
                    ? 'text-[#5DD39E]' 
                    : totalBalance < 0 
                    ? 'text-[#FF6B6B]'
                    : 'text-gray-500'
                }`}>
                  {totalBalance > 0 
                    ? 'You are owed' 
                    : totalBalance < 0 
                    ? 'You owe'
                    : 'All settled up'}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Cakes List */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold pixel-text text-[#2D3748] mb-4">Cakes</h2>
          
          {cakes.length === 0 ? (
            <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-3 border-[#E9D5FF] text-center">
              <div className="text-4xl mb-4">🍰</div>
              <div className="text-lg font-bold pixel-text text-[#2D3748] mb-2">No cakes yet</div>
              <div className="text-sm text-[#4A5568] mb-4">This user is not part of any cakes.</div>
              <Link href="/dashboard">
                <Button className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button">
                  Create a Cake
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cakes.map((cake) => {
                const cakeIcon = getIconFromIndex(cake.icon_index)
                const hasBalance = cake.userBalance !== 0
                
                return (
                  <Card 
                    key={cake.id}
                    className={`p-6 pixel-card backdrop-blur border-4 transition-all hover:-translate-y-1 ${
                      cake.userBalance > 0
                        ? 'bg-[#5DD39E]/10 border-[#5DD39E]'
                        : cake.userBalance < 0
                        ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]'
                        : 'bg-white/80 border-[#E9D5FF]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-2xl flex-shrink-0">
                          {cakeIcon}
                        </div>
                        <div>
                          <h3 className="font-bold pixel-text text-[#2D3748] mb-1">{cake.name}</h3>
                          {cake.description && (
                            <p className="text-xs text-[#4A5568] line-clamp-2">{cake.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Balance Display */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#4A5568]">Your Balance</span>
                        <div className={`flex items-center gap-1 ${
                          cake.userBalance > 0 
                            ? 'text-[#5DD39E]' 
                            : cake.userBalance < 0 
                            ? 'text-[#FF6B6B]'
                            : 'text-gray-500'
                        }`}>
                          {cake.userBalance > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : cake.userBalance < 0 ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : null}
                          <span className={`text-lg font-bold pixel-text ${
                            cake.userBalance > 0 
                              ? 'text-[#5DD39E]' 
                              : cake.userBalance < 0 
                              ? 'text-[#FF6B6B]'
                              : 'text-gray-500'
                          }`}>
                            {cake.userBalance > 0 ? '+' : ''}${cake.userBalance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {isOwnProfile && (
                        <div className={`text-xs ${
                          cake.userBalance > 0 
                            ? 'text-[#5DD39E]' 
                            : cake.userBalance < 0 
                            ? 'text-[#FF6B6B]'
                            : 'text-gray-500'
                        }`}>
                          {cake.userBalance > 0 
                            ? 'You are owed' 
                            : cake.userBalance < 0 
                            ? 'You owe'
                            : 'All settled up'}
                        </div>
                      )}
                    </div>

                    {/* Members Count */}
                    <div className="flex items-center gap-2 text-sm text-[#4A5568] mb-4">
                      <Users className="w-4 h-4" />
                      <span>{cake.member_ids?.length || 0} members</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/dashboard/${cake.id}`} className="flex-1">
                        <Button 
                          variant="outline" 
                          className="w-full pixel-button border-2 border-[#E9D5FF] hover:border-[#FFB6D9]"
                        >
                          View Details
                        </Button>
                      </Link>
                      {hasBalance && isOwnProfile && (
                        <Link href={`/dashboard/${cake.id}/settle`}>
                          <Button className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Settle
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

