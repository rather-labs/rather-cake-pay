'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useCakes } from '@/hooks/use-cakes';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserContext, WalletType } from '@/contexts/UserContext';
import { ICON_OPTIONS } from '@/lib/constants';
import { createCake } from '@/lib/actions/cakes';
import { searchUsers } from '@/lib/actions/users';
import type { User } from '@/types/database';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { CAKE_FACTORY_ABI, CONTRACT_ADDRESS_ETH_SEPOLIA, CAKE_FACTORY_CHAIN_ID } from '@/lib/contracts/cakeFactory';
import { lemonClient } from '@/lib/lemon/client';
import { TransactionResult } from '@lemoncash/mini-app-sdk';

export default function Dashboard() {
  const { walletAddress, walletType } = useUserContext();
  const { user, loading: userLoading } = useCurrentUser();
  const { cakes, loading: cakesLoading, error, refresh } = useCakes(user?.id || 0);

  const loading = userLoading || cakesLoading;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>(ICON_OPTIONS[0]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [memberSearchQueries, setMemberSearchQueries] = useState<string[]>(['']);
  const [memberSearchResults, setMemberSearchResults] = useState<User[][]>([[]]);
  const [showMemberDropdowns, setShowMemberDropdowns] = useState<boolean[]>([false]);
  const [token, setToken] = useState('0x0000000000000000000000000000000000000000'); // Default to native ETH
  const [interestRate, setInterestRate] = useState('0');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  type PendingGroupData = {
    name: string;
    description: string | null;
    iconIndex: number;
    creatorId: number;
    memberIds: number[];
  };

  const [pendingGroupData, setPendingGroupData] = useState<PendingGroupData | null>(null);

  useEffect(() => {
    if (writeError) {
      console.error('Transaction error:', writeError);
      setCreateError(`Failed to create group on blockchain: ${writeError.message}`);
      setIsCreating(false);
      setPendingGroupData(null);
    }
  }, [writeError]);

  const completeGroupCreation = useCallback(
    async (txHash?: string, overrideData?: PendingGroupData | null) => {
      const dataToPersist = overrideData ?? pendingGroupData;
      if (!dataToPersist) {
        return;
      }

      if (txHash) {
        console.log('Transaction confirmed! Hash:', txHash);
      }
      console.log('Creating group in database...');

      try {
        const { data, error: dbError } = await createCake(
          dataToPersist.name,
          dataToPersist.description,
          dataToPersist.iconIndex,
          dataToPersist.creatorId,
          dataToPersist.memberIds
        );

        if (dbError) {
          setCreateError(dbError);
          return;
        }

        if (data) {
          setShowCreateModal(false);
          setGroupName('');
          setDescription('');
          setSelectedIcon(ICON_OPTIONS[0]);
          setSelectedMembers([]);
          setMemberSearchQueries(['']);
          setMemberSearchResults([[]]);
          setShowMemberDropdowns([false]);
          setToken('0x0000000000000000000000000000000000000000');
          setInterestRate('0');
          setCreateError(null);
          setPendingGroupData(null);

          await refresh();
        }
      } catch (error) {
        console.error('Error creating group in database:', error);
        setCreateError(error instanceof Error ? error.message : 'Failed to create group in database');
      } finally {
        setIsCreating(false);
      }
    },
    [pendingGroupData, refresh]
  );

  useEffect(() => {
    if (isConfirmed && hash && pendingGroupData) {
      completeGroupCreation(hash, pendingGroupData);
    }
  }, [completeGroupCreation, hash, isConfirmed, pendingGroupData]);

  // Helper function to get icon from index
  const getIconFromIndex = (index: number | null) => {
    if (index === null || index < 0 || index >= ICON_OPTIONS.length) {
      return ICON_OPTIONS[0]; // Default to first icon
    }
    return ICON_OPTIONS[index];
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.member-search-container')) {
        setShowMemberDropdowns(new Array(memberSearchQueries.length).fill(false));
      }
    };

    if (showMemberDropdowns.some((show) => show)) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMemberDropdowns, memberSearchQueries.length]);

  const handleAddMember = () => {
    setMemberSearchQueries([...memberSearchQueries, '']);
    setMemberSearchResults([...memberSearchResults, []]);
    setShowMemberDropdowns([...showMemberDropdowns, false]);
  };

  const handleRemoveMember = (index: number) => {
    // Remove the selected member if one was chosen
    if (index < selectedMembers.length) {
      setSelectedMembers(selectedMembers.filter((_, i) => i !== index));
    }
    setMemberSearchQueries(memberSearchQueries.filter((_, i) => i !== index));
    setMemberSearchResults(memberSearchResults.filter((_, i) => i !== index));
    setShowMemberDropdowns(showMemberDropdowns.filter((_, i) => i !== index));
  };

  const handleMemberSearch = async (index: number, query: string) => {
    const newQueries = [...memberSearchQueries];
    newQueries[index] = query;
    setMemberSearchQueries(newQueries);

    if (query.trim().length === 0) {
      const newResults = [...memberSearchResults];
      newResults[index] = [];
      setMemberSearchResults(newResults);
      const newDropdowns = [...showMemberDropdowns];
      newDropdowns[index] = false;
      setShowMemberDropdowns(newDropdowns);
      return;
    }

    // Search users
    const { data, error } = await searchUsers(query);
    if (error) {
      console.error('Error searching users:', error);
      return;
    }

    const newResults = [...memberSearchResults];
    newResults[index] = data || [];
    setMemberSearchResults(newResults);

    const newDropdowns = [...showMemberDropdowns];
    newDropdowns[index] = (data || []).length > 0;
    setShowMemberDropdowns(newDropdowns);
  };

  const handleSelectMember = (index: number, user: User) => {
    // Update selected members
    const newSelected = [...selectedMembers];
    if (index < newSelected.length) {
      newSelected[index] = user;
    } else {
      newSelected.push(user);
    }
    setSelectedMembers(newSelected);

    // Clear search query and results
    const newQueries = [...memberSearchQueries];
    newQueries[index] = user.username || '';
    setMemberSearchQueries(newQueries);

    const newResults = [...memberSearchResults];
    newResults[index] = [];
    setMemberSearchResults(newResults);

    const newDropdowns = [...showMemberDropdowns];
    newDropdowns[index] = false;
    setShowMemberDropdowns(newDropdowns);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      // Validate token address
      const tokenAddress = token.trim() || '0x0000000000000000000000000000000000000000';
      if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
        setCreateError(
          'Invalid token address. Use 0x0000000000000000000000000000000000000000 for native ETH or a valid contract address.'
        );
        setIsCreating(false);
        return;
      }

      // Validate interest rate
      const interestRateNum = Number.parseFloat(interestRate);
      if (Number.isNaN(interestRateNum) || interestRateNum < 0 || interestRateNum > 100) {
        setCreateError('Interest rate must be a number between 0 and 100.');
        setIsCreating(false);
        return;
      }

      // Validate members
      const invalidMembers: number[] = [];
      memberSearchQueries.forEach((query, index) => {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length > 0) {
          const selectedMember = selectedMembers[index];
          if (!selectedMember || !selectedMember.id) {
            invalidMembers.push(index + 1);
          }
        }
      });

      if (invalidMembers.length > 0) {
        setCreateError(
          `Please select valid users from the dropdown for member ${invalidMembers.length === 1 ? 'field' : 'fields'} ${invalidMembers.join(', ')}.`
        );
        setIsCreating(false);
        return;
      }

      // Get member IDs
      const memberIds = selectedMembers.filter((member) => member?.id).map((member) => member.id);

      if (selectedMembers.length > 0 && memberIds.length !== selectedMembers.length) {
        setCreateError('Some selected members are invalid.');
        setIsCreating(false);
        return;
      }

      if (!user) {
        setCreateError('User not found. Please register first.');
        setIsCreating(false);
        return;
      }

      const iconIndex = ICON_OPTIONS.indexOf(selectedIcon as (typeof ICON_OPTIONS)[number]);
      const iconIndexValue = iconIndex >= 0 ? iconIndex : 0;

      // Store data for database creation after blockchain confirmation
      const nextGroupData: PendingGroupData = {
        name: groupName.trim(),
        description: description.trim() || null,
        iconIndex: iconIndexValue,
        creatorId: user.id,
        memberIds: memberIds,
      };
      setPendingGroupData(nextGroupData);

      // Prepare blockchain data
      // All member IDs including creator
      const allMemberIds = [BigInt(user.id), ...memberIds.map((id) => BigInt(id))];

      // Create initial weights array (equal split)
      const totalMembers = allMemberIds.length;
      const equalWeight = Math.floor(10000 / totalMembers); // 10000 = 100% in BPS
      const weights = new Array(totalMembers).fill(equalWeight);

      // Adjust last weight to account for rounding
      const weightSum = equalWeight * totalMembers;
      if (weightSum < 10000) {
        weights[weights.length - 1] += 10000 - weightSum;
      }

      // Convert interest rate to BPS (basis points: 5% = 500 BPS)
      const interestRateBPS = Math.floor(interestRateNum * 100);

      // Default billing period: 30 days in seconds
      const billingPeriodSeconds = BigInt(30 * 24 * 60 * 60); // 30 days

      console.log('Creating cake on blockchain:', {
        token: tokenAddress,
        memberIds: allMemberIds.map((id) => id.toString()),
        weights,
        interestRate: interestRateBPS,
        billingPeriod: billingPeriodSeconds.toString(),
      });

      if (walletType === WalletType.LEMON) {
        const result = await lemonClient.callContract({
          contractAddress: CONTRACT_ADDRESS_ETH_SEPOLIA,
          functionName: 'createCake',
          args: [
            tokenAddress as `0x${string}`,
            allMemberIds,
            weights,
            interestRateBPS,
            billingPeriodSeconds,
          ],
          chainId: CAKE_FACTORY_CHAIN_ID,
          value: '0',
        });

        if (result.result === TransactionResult.SUCCESS && result.data?.txHash) {
          await completeGroupCreation(result.data.txHash, nextGroupData);
          return;
        }

        if (result.result === TransactionResult.CANCELLED) {
          throw new Error('Transaction cancelled by user');
        }

        if (result.result === TransactionResult.FAILED) {
          throw new Error(result.error?.message || 'Failed to create group via Lemon Cash');
        }

        throw new Error('Unexpected response from Lemon Cash');
      }

      // Call the smart contract with correct parameter order
      writeContract({
        address: CONTRACT_ADDRESS_ETH_SEPOLIA,
        abi: CAKE_FACTORY_ABI,
        functionName: 'createCake',
        args: [
          tokenAddress as `0x${string}`, // address token
          allMemberIds, // uint64[] memberIds
          weights, // uint16[] memberWeightsBps
          interestRateBPS, // uint16 interestRate in BPS
          billingPeriodSeconds, // uint64 billingPeriod in seconds
        ],
      });
    } catch (error) {
      console.error('Error initiating group creation:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create group');
      setIsCreating(false);
      setPendingGroupData(null);
    }
  };

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
              {user && (
                <div
                  className="w-10 h-10 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-xl cursor-pointer hover:scale-110 transition-transform"
                  title={user.username || 'User'}
                >
                  👤
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Your Groups Section */}
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl md:text-4xl font-bold pixel-text text-[#2D3748]">
                Your Groups
              </h1>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Group
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4 animate-bounce">🍰</div>
                <p className="text-[#4A5568]">
                  {userLoading ? 'Checking your account...' : 'Loading your groups...'}
                </p>
              </div>
            ) : !walletAddress ? (
              <Card className="p-12 pixel-card bg-gradient-to-br from-[#FFB6D9]/20 to-[#B4E7CE]/20 border-4 border-dashed border-[#FFB6D9] text-center">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-bold pixel-text text-[#2D3748] mb-2">
                  Connect Your Wallet
                </h3>
                <p className="text-[#4A5568] mb-6">
                  Connect your wallet to start creating and managing groups!
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </Card>
            ) : !user ? (
              <Card className="p-6 pixel-card bg-[#FF6B6B]/10 border-4 border-[#FF6B6B]">
                <p className="text-[#FF6B6B]">Please register to continue.</p>
              </Card>
            ) : error ? (
              <Card className="p-6 pixel-card bg-[#FF6B6B]/10 border-4 border-[#FF6B6B]">
                <p className="text-[#FF6B6B]">Error loading groups: {error.message}</p>
              </Card>
            ) : cakes.length > 0 ? (
              <div className="grid gap-4">
                {cakes.map((cake) => (
                  <Link key={cake.id} href={`/dashboard/${cake.id}`}>
                    <Card className="p-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#FFB6D9] hover:border-[#FF69B4] cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-16 h-16 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-3xl">
                            {getIconFromIndex(cake.icon_index)}
                          </div>

                          <div className="flex-1">
                            <h3 className="text-xl font-bold pixel-text text-[#2D3748] mb-1">
                              {cake.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-[#4A5568]">
                              {cake.description && <span>{cake.description}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-[#4A5568]">View Details →</div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {/* Empty State for New Users */}
          {!loading && cakes.length === 0 && (
            <Card className="p-12 pixel-card bg-gradient-to-br from-[#FFB6D9]/20 to-[#B4E7CE]/20 border-4 border-dashed border-[#FFB6D9] text-center">
              <div className="text-6xl mb-4">🎂</div>
              <h3 className="text-xl font-bold pixel-text text-[#2D3748] mb-2">No groups yet</h3>
              <p className="text-[#4A5568] mb-6">
                Create your first group to start splitting expenses with friends!
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#B4E7CE] hover:bg-[#5DD39E] text-[#2D3748] pixel-button"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Group
              </Button>
            </Card>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md pixel-card bg-white border-4 border-[#FFB6D9] max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold pixel-text text-[#2D3748]">Create New Group</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setGroupName('');
                    setDescription('');
                    setSelectedIcon(ICON_OPTIONS[0]);
                    setSelectedMembers([]);
                    setMemberSearchQueries(['']);
                    setMemberSearchResults([[]]);
                    setShowMemberDropdowns([false]);
                    setToken('0x0000000000000000000000000000000000000000');
                    setInterestRate('0');
                    setCreateError(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#FFF5F7] pixel-art-shadow transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Group Name */}
                <div>
                  <label
                    htmlFor="group-name"
                    className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                  >
                    Group Name
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Weekend Trip, Roommates..."
                    className="w-full px-4 py-3 border-4 border-[#FFB6D9] focus:border-[#FF69B4] outline-none pixel-art-shadow bg-white"
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="group-description"
                    className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                  >
                    Description (optional)
                  </label>
                  <textarea
                    id="group-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description for this group..."
                    rows={3}
                    className="w-full px-4 py-3 border-4 border-[#FFB6D9] focus:border-[#FF69B4] outline-none pixel-art-shadow bg-white resize-none"
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Choose an Icon
                  </label>
                  <div className="grid grid-cols-6 gap-2" role="group" aria-label="Icon selection">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedIcon(icon)}
                        className={`w-full aspect-square text-2xl flex items-center justify-center pixel-art-shadow hover:scale-110 transition-transform ${
                          selectedIcon === icon
                            ? 'bg-[#FF69B4] border-4 border-[#FF1493]'
                            : 'bg-[#FFF5F7] border-4 border-[#FFB6D9]'
                        }`}
                        aria-label={`Select ${icon} icon`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Token Address */}
                <div>
                  <label
                    htmlFor="token-address"
                    className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                  >
                    Token Address
                  </label>
                  <input
                    id="token-address"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="0x0000000000000000000000000000000000000000 (0x0 for native ETH)"
                    className="w-full px-4 py-3 border-4 border-[#FFB6D9] focus:border-[#FF69B4] outline-none pixel-art-shadow bg-white font-mono text-sm"
                  />
                  <p className="text-xs text-[#4A5568] mt-1">
                    Use 0x0 or leave empty for native ETH. Enter contract address for ERC-20 tokens.
                  </p>
                </div>

                {/* Interest Rate */}
                <div>
                  <label
                    htmlFor="interest-rate"
                    className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                  >
                    Interest Rate (%)
                  </label>
                  <input
                    id="interest-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border-4 border-[#FFB6D9] focus:border-[#FF69B4] outline-none pixel-art-shadow bg-white"
                  />
                  <p className="text-xs text-[#4A5568] mt-1">
                    Annual interest rate (0-100%) to be added to unpaid amounts.
                  </p>
                </div>

                {/* Members */}
                <div>
                  <label className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Add Members (optional)
                  </label>
                  <div className="space-y-2">
                    {memberSearchQueries.map((query, index) => {
                      const selectedMember = selectedMembers[index];
                      const searchResults = memberSearchResults[index] || [];
                      const showDropdown = showMemberDropdowns[index] && searchResults.length > 0;

                      return (
                        <div key={`member-${index}`} className="relative member-search-container">
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={selectedMember ? selectedMember.username || '' : query}
                                onChange={(e) => {
                                  if (selectedMember) {
                                    // Clear selection if user starts typing
                                    const newSelected = [...selectedMembers];
                                    newSelected.splice(index, 1);
                                    setSelectedMembers(newSelected);
                                  }
                                  handleMemberSearch(index, e.target.value);
                                }}
                                onFocus={() => {
                                  if (query.trim().length > 0 && searchResults.length > 0) {
                                    const newDropdowns = [...showMemberDropdowns];
                                    newDropdowns[index] = true;
                                    setShowMemberDropdowns(newDropdowns);
                                  }
                                }}
                                placeholder="Type username to search..."
                                className="w-full px-4 py-2 border-4 border-[#B4E7CE] focus:border-[#5DD39E] outline-none pixel-art-shadow bg-white text-sm"
                                aria-label={`Member ${index + 1}`}
                              />
                              {showDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white border-4 border-[#B4E7CE] pixel-art-shadow max-h-48 overflow-y-auto">
                                  {searchResults.map((user) => (
                                    <button
                                      key={user.id}
                                      type="button"
                                      onClick={() => handleSelectMember(index, user)}
                                      className="w-full px-4 py-2 text-left hover:bg-[#F0F9F4] transition-colors border-b-2 border-[#B4E7CE] last:border-b-0"
                                    >
                                      <div className="font-medium text-[#2D3748]">
                                        {user.username || 'No username'}
                                      </div>
                                      {user.wallet_address && (
                                        <div className="text-xs text-[#4A5568] font-mono">
                                          {user.wallet_address.slice(0, 10)}...
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {memberSearchQueries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(index)}
                                className="w-10 h-10 flex items-center justify-center bg-[#FF6B6B] hover:bg-[#FF4444] pixel-art-shadow transition-colors"
                                aria-label={`Remove member ${index + 1}`}
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      type="button"
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

              {createError && (
                <div className="mt-4 p-3 bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] rounded">
                  <p className="text-sm text-[#FF6B6B]">{createError}</p>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setGroupName('');
                    setDescription('');
                    setSelectedIcon(ICON_OPTIONS[0]);
                    setSelectedMembers([]);
                    setMemberSearchQueries(['']);
                    setMemberSearchResults([[]]);
                    setShowMemberDropdowns([false]);
                    setToken('0x0000000000000000000000000000000000000000');
                    setInterestRate('0');
                    setCreateError(null);
                  }}
                  variant="outline"
                  className="flex-1 pixel-button border-2 border-[#FFB6D9]"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || isCreating || isWriting || isConfirming}
                  className="flex-1 bg-[#FF69B4] hover:bg-[#FF1493] pixel-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isWriting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Signing Transaction...
                    </>
                  ) : isConfirming ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Confirming on Blockchain...
                    </>
                  ) : isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating in Database...
                    </>
                  ) : (
                    'Create Group'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
