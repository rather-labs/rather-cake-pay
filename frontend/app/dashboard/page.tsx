'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Users, TrendingUp, TrendingDown, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🍰')
  const [members, setMembers] = useState<string[]>([''])
  const [groups, setGroups] = useState([
    {
      id: 1,
      name: 'Weekend Trip',
      icon: '🏖️',
      totalExpenses: 1250.50,
      yourBalance: 125.75,
      members: 4
    },
    {
      id: 2,
      name: 'Roommates',
      icon: '🏠',
      totalExpenses: 890.00,
      yourBalance: -45.20,
      members: 3
    },
    {
      id: 3,
      name: 'Dinner Squad',
      icon: '🍕',
      totalExpenses: 345.80,
      yourBalance: 67.40,
      members: 5
    }
  ])

  const iconOptions = ['🍰', '🏖️', '🏠', '🍕', '✈️', '🎉', '🎮', '🏃', '🎬', '☕', '🍔', '🎸']

  const handleAddMember = () => {
    setMembers([...members, ''])
  }

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
  }

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members]
    newMembers[index] = value
    setMembers(newMembers)
  }

  const handleCreateGroup = () => {
    if (!groupName.trim()) return
    
    const validMembers = members.filter(m => m.trim() !== '')
    const newGroup = {
      id: groups.length + 1,
      name: groupName,
      icon: selectedIcon,
      totalExpenses: 0,
      yourBalance: 0,
      members: validMembers.length + 1 // +1 for the current user
    }
    
    setGroups([...groups, newGroup])
    setShowCreateModal(false)
    setGroupName('')
    setSelectedIcon('🍰')
    setMembers([''])
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
        {/* Your Groups Section */}
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl md:text-4xl font-bold pixel-text text-[#2D3748]">Your Groups</h1>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Group
              </Button>
            </div>

            <div className="grid gap-4">
              {groups.map((group) => (
                <Link key={group.id} href={`/dashboard/${group.id}`}>
                  <Card 
                    className="p-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#FFB6D9] hover:border-[#FF69B4] cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-16 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-3xl">
                          {group.icon}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-xl font-bold pixel-text text-[#2D3748] mb-1">{group.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-[#4A5568]">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {group.members} members
                            </div>
                            <div>Total: ${group.totalExpenses.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-2xl font-bold pixel-text ${group.yourBalance >= 0 ? 'text-[#5DD39E]' : 'text-[#FF6B6B]'}`}>
                          {group.yourBalance >= 0 ? '+' : ''}${Math.abs(group.yourBalance).toFixed(2)}
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${group.yourBalance >= 0 ? 'text-[#5DD39E]' : 'text-[#FF6B6B]'}`}>
                          {group.yourBalance >= 0 ? (
                            <>
                              <TrendingUp className="w-4 h-4" />
                              You are owed
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4" />
                              You owe
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Empty State for New Users */}
          <Card className="p-12 pixel-card bg-gradient-to-br from-[#FFB6D9]/20 to-[#B4E7CE]/20 border-4 border-dashed border-[#FFB6D9] text-center">
            <div className="text-6xl mb-4">🎂</div>
            <h3 className="text-xl font-bold pixel-text text-[#2D3748] mb-2">No more groups yet</h3>
            <p className="text-[#4A5568] mb-6">Create your first group to start splitting expenses with friends!</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#B4E7CE] hover:bg-[#5DD39E] text-[#2D3748] pixel-button"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Group
            </Button>
          </Card>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md pixel-card bg-white border-4 border-[#FFB6D9] max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold pixel-text text-[#2D3748]">Create New Group</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#FFF5F7] pixel-art-shadow transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Group Name */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Weekend Trip, Roommates..."
                    className="w-full px-4 py-3 border-4 border-[#FFB6D9] focus:border-[#FF69B4] outline-none pixel-art-shadow bg-white"
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Choose an Icon
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setSelectedIcon(icon)}
                        className={`w-full aspect-square text-2xl flex items-center justify-center pixel-art-shadow hover:scale-110 transition-transform ${
                          selectedIcon === icon 
                            ? 'bg-[#FF69B4] border-4 border-[#FF1493]' 
                            : 'bg-[#FFF5F7] border-4 border-[#FFB6D9]'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Members */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Add Members (optional)
                  </label>
                  <div className="space-y-2">
                    {members.map((member, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={member}
                          onChange={(e) => handleMemberChange(index, e.target.value)}
                          placeholder="Friend's name or wallet address"
                          className="flex-1 px-4 py-2 border-4 border-[#B4E7CE] focus:border-[#5DD39E] outline-none pixel-art-shadow bg-white text-sm"
                        />
                        {members.length > 1 && (
                          <button
                            onClick={() => handleRemoveMember(index)}
                            className="w-10 h-10 flex items-center justify-center bg-[#FF6B6B] hover:bg-[#FF4444] pixel-art-shadow transition-colors"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      onClick={handleAddMember}
                      variant="outline"
                      className="w-full pixel-button border-2 border-[#B4E7CE] text-[#2D3748]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Member
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="flex-1 pixel-button border-2 border-[#FFB6D9]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim()}
                  className="flex-1 bg-[#FF69B4] hover:bg-[#FF1493] pixel-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Group
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
