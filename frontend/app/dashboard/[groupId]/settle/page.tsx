'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function SettleUpPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params
  const [status, setStatus] = useState<'summary' | 'processing' | 'success'>('summary')

  // Mock settlement data
  const settlement = {
    youOwe: [
      { name: 'Alice', avatar: '👩', amount: 45.00 }
    ],
    totalAmount: 45.00
  }

  const handleConfirmSettlement = () => {
    setStatus('processing')
    
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Summary Screen */}
        {status === 'summary' && (
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

            <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#FFB6D9] mb-6">
              <h2 className="text-xl font-bold pixel-text text-[#2D3748] mb-6">Settlement Breakdown</h2>
              
              {settlement.youOwe.map((person, index) => (
                <div key={index} className="mb-6">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-3xl">
                        👤
                      </div>
                      <span className="text-lg font-bold pixel-text">You</span>
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 bg-[#FF69B4] animate-pulse" style={{ animationDelay: '0s' }}></div>
                        <div className="w-3 h-3 bg-[#FF69B4] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-3 h-3 bg-[#FF69B4] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <ArrowRight className="w-6 h-6 text-[#FF69B4]" />
                      <div className="flex gap-1">
                        <div className="w-3 h-3 bg-[#FF69B4] animate-pulse" style={{ animationDelay: '0s' }}></div>
                        <div className="w-3 h-3 bg-[#FF69B4] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-3 h-3 bg-[#FF69B4] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-3xl">
                        {person.avatar}
                      </div>
                      <span className="text-lg font-bold pixel-text">{person.name}</span>
                    </div>
                  </div>

                  <div className="bg-[#FFB6D9]/10 border-3 border-[#FFB6D9] rounded p-4 text-center">
                    <div className="text-sm text-[#4A5568] mb-1">You owe {person.name}</div>
                    <div className="text-3xl font-bold pixel-text text-[#FF69B4] mb-2">
                      ${person.amount.toFixed(2)}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-[#4A5568]">
                      <div className="w-5 h-5 bg-[#B4E7CE] pixel-art-shadow flex items-center justify-center text-xs">💰</div>
                      <span>Paid in stablecoins (USDC)</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-6 border-t-3 border-[#E9D5FF] mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold pixel-text text-[#2D3748]">Total to Settle</span>
                  <span className="text-3xl font-bold pixel-text text-[#FF69B4]">
                    ${settlement.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            <Button 
              onClick={handleConfirmSettlement}
              className="w-full bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 py-8 text-2xl"
            >
              <div className="mr-3 text-3xl">🎂</div>
              Confirm Settlement
            </Button>
          </>
        )}

        {/* Processing Screen */}
        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative mb-8">
              <div className="text-8xl animate-spin" style={{ animationDuration: '2s' }}>🍰</div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-8 border-[#FFB6D9] border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>

            <h2 className="text-3xl font-bold pixel-text text-[#2D3748] mb-4">Processing your payment...</h2>
            <p className="text-[#4A5568] text-center max-w-md">
              Hang tight! We&apos;re securely processing your settlement.
            </p>

            {/* Pixel Progress Bar */}
            <div className="w-full max-w-md mt-8 bg-white border-4 border-[#FFB6D9] rounded h-8 overflow-hidden pixel-art-shadow">
              <div className="h-full bg-gradient-to-r from-[#FF69B4] to-[#FFB6D9] animate-pulse" style={{ width: '70%' }}></div>
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
                <p className="text-[#4A5568] mb-2">You paid</p>
                <p className="text-3xl font-bold pixel-text text-[#2D3748] mb-2">
                  ${settlement.totalAmount.toFixed(2)}
                </p>
                <p className="text-[#4A5568]">to Alice</p>
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
