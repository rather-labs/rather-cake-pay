'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] via-[#F0F9F4] to-[#FFF9E5] overflow-hidden">
      {/* Floating decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-[10%] animate-float-slow">
          <div className="w-8 h-8 bg-[#FFB6D9] pixel-art-shadow" style={{ clipPath: 'polygon(0% 20%, 20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%)' }} />
        </div>
        <div className="absolute top-40 right-[15%] animate-float-medium">
          <div className="w-6 h-6 bg-[#B4E7CE] pixel-art-shadow" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
        </div>
        <div className="absolute top-[60%] left-[20%] animate-float-fast">
          <div className="w-5 h-5 bg-[#E9D5FF] pixel-art-shadow rotate-45" />
        </div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-16 pb-24 relative">
        <div className={`max-w-6xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Pixel Art Hero Illustration */}
          
          <div className="mb-8 flex justify-center">
            <div className="relative inline-block animate-bounce-slow">
              {/* Cake body - three layers */}
              <div className="relative">
                {/* Top layer */}
                <div className="w-32 h-8 bg-[#FFB6D9] mx-auto pixel-art-shadow border-4 border-[#FF69B4]" />
                {/* Middle layer */}
                <div className="w-40 h-8 bg-[#FF69B4] mx-auto pixel-art-shadow border-4 border-[#FF1493]" />
                {/* Bottom layer */}
                <div className="w-48 h-10 bg-[#FFB6D9] mx-auto pixel-art-shadow border-4 border-[#FF69B4] rounded-b-lg" />
                
                {/* Meme face on cake */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-24 h-16">
                  {/* Eyes */}
                  <div className="flex justify-center gap-4 mt-1">
                    <div className="w-4 h-6 bg-[#2D3748] border-2 border-[#1A202C]" />
                    <div className="w-4 h-6 bg-[#2D3748] border-2 border-[#1A202C]" />
                  </div>
                  {/* Smirk mouth */}
                  <div className="mt-1 flex justify-center">
                    <div className="w-12 h-1 bg-[#2D3748]" />
                    <div className="w-2 h-2 bg-[#2D3748] -ml-1" />
                  </div>
                </div>

                {/* Candles */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-4">
                  <div className="relative">
                    <div className="w-2 h-6 bg-[#E9D5FF] border-2 border-[#C084FC]" />
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFC107] rounded-full animate-pulse" />
                  </div>
                  <div className="relative">
                    <div className="w-2 h-6 bg-[#B4E7CE] border-2 border-[#5DD39E]" />
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFC107] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 pixel-text text-[#FF69B4] leading-tight text-balance">
            Split Bills Like Splitting Cake 🍰
          </h1>
          
          <p className="text-xl md:text-2xl mb-12 text-[#2D3748] max-w-3xl mx-auto leading-relaxed text-pretty">
            Pay in any crypto, settle in stablecoins. No gas fees, no hassle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              className="text-lg px-8 py-6 bg-[#FF69B4] hover:bg-[#FF1493] text-white pixel-button shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
              asChild
            >
              <a href="/dashboard">🍰 Launch App</a>
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-4 border-[#B4E7CE] text-[#2D3748] hover:bg-[#B4E7CE] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              onClick={() => scrollToSection('features')}
            >
              Learn More
            </Button>
          </div>

          {/* Decorative cake slices */}
          <div className="flex justify-center gap-4 mt-16 opacity-70">
            <span className="text-4xl animate-bounce-slow">🍰</span>
            <span className="text-4xl animate-bounce-medium" style={{ animationDelay: '0.2s' }}>🎂</span>
            <span className="text-4xl animate-bounce-slow" style={{ animationDelay: '0.4s' }}>🥧</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#FFB6D9] hover:border-[#FF69B4] transition-all hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-6 flex justify-center">
                <img 
                  src="/pixel-art-icon-of-multiple-colorful-cryptocurrency.jpg" 
                  alt="Multiple crypto coins"
                  className="w-24 h-24 pixel-art-filter"
                />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#FF69B4] pixel-text text-center">Pay Your Way</h3>
              <p className="text-[#2D3748] text-center leading-relaxed">Use any EVM token. We handle the rest.</p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#B4E7CE] hover:border-[#5DD39E] transition-all hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-6 flex justify-center">
                <img 
                  src="/pixel-art-icon-of-lightning-bolt-or-speed-lines-re.jpg" 
                  alt="Zero friction"
                  className="w-24 h-24 pixel-art-filter"
                />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#5DD39E] pixel-text text-center">Zero Friction</h3>
              <p className="text-[#2D3748] text-center leading-relaxed">No gas fees. No complexity. Just pay.</p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#E9D5FF] hover:border-[#C084FC] transition-all hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-6 flex justify-center">
                <img 
                  src="/pixel-art-icon-of-trophy-with-star-and-leaderboard.jpg" 
                  alt="Make it fun"
                  className="w-24 h-24 pixel-art-filter"
                />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#C084FC] pixel-text text-center">Make It Fun</h3>
              <p className="text-[#2D3748] text-center leading-relaxed">Compete on the leaderboard. Settle up with style.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 pixel-text text-[#2D3748]">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <img 
                    src="/pixel-art-of-group-of-people-with-cake-icon-repres.jpg" 
                    alt="Create a group"
                    className="w-32 h-32 pixel-art-filter group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#FF69B4] text-white rounded-full flex items-center justify-center font-bold pixel-text">1</div>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#2D3748] pixel-text">Create a group</h3>
              <p className="text-[#4A5568] leading-relaxed">Invite friends and start splitting</p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <img 
                    src="/pixel-art-of-receipt-or-bill-with-items-listed-on-.jpg" 
                    alt="Add expenses"
                    className="w-32 h-32 pixel-art-filter group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#5DD39E] text-white rounded-full flex items-center justify-center font-bold pixel-text">2</div>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#2D3748] pixel-text">Add expenses</h3>
              <p className="text-[#4A5568] leading-relaxed">Track who paid for what</p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <img 
                    src="/pixel-art-of-coins-or-money-exchanging-hands-betwe.jpg" 
                    alt="Settle up"
                    className="w-32 h-32 pixel-art-filter group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#C084FC] text-white rounded-full flex items-center justify-center font-bold pixel-text">3</div>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#2D3748] pixel-text">Settle up instantly</h3>
              <p className="text-[#4A5568] leading-relaxed">Pay with crypto in seconds</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-[#FFB6D9] via-[#B4E7CE] to-[#E9D5FF] p-12 rounded-3xl pixel-card shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 pixel-text text-[#2D3748] text-balance">
            Ready to make splitting bills fun?
          </h2>
          <Button 
            size="lg"
            className="text-xl px-12 py-7 bg-[#2D3748] hover:bg-[#1A202C] text-white pixel-button shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
            asChild
          >
            <a href="/dashboard">🚀 Launch App</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-[#FFB6D9] bg-white/50 backdrop-blur mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-8 text-sm text-[#4A5568]">
              <a href="#" className="hover:text-[#FF69B4] transition-colors">Twitter</a>
              <a href="#" className="hover:text-[#FF69B4] transition-colors">Discord</a>
              <a href="#" className="hover:text-[#FF69B4] transition-colors">GitHub</a>
            </div>
            
            <div className="inline-block bg-[#2D3748] text-white px-6 py-2 rounded-full text-sm font-semibold pixel-text">
              ✨ Built for ETH Hackathon
            </div>

            {/* Decorative footer cakes */}
            <div className="flex gap-3 text-2xl opacity-70">
              <span>🍰</span>
              <span>🎂</span>
              <span>🥧</span>
              <span>🧁</span>
              <span>🍮</span>
              <span>🥮</span>
            </div>

            <p className="text-sm text-[#718096] mt-4">
              © 2025 CakePay. Making crypto splits as easy as pie.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
