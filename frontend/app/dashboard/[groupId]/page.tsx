'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  Plus,
  Users,
  Calendar,
  Utensils,
  X,
  Trophy,
  Medal,
  Award,
  Lock,
  Upload,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { createClient } from '@/lib/supabase/client';
import { CakesAPI } from '@/lib/api/cakes';
import { IngredientsAPI } from '@/lib/api/ingredients';
import { UsersAPI } from '@/lib/api/users';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ICON_OPTIONS } from '@/lib/constants';
import type { Cake, CakeIngredient, User } from '@/types/database';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

import CakeFactoryArtifactAbi from '@/public/contracts/CakeFactory.json';
import { parseUnits } from 'viem';
import { useContractAddress } from '@/hooks/use-contract-address';

export const CAKE_FACTORY_ABI = CakeFactoryArtifactAbi.abi;

type MemberWithBalance = User & {
  balance: number;
};

type ExpenseWithDetails = CakeIngredient & {
  paidByUser?: User;
  totalAmount: number;
  yourShare: number;
};

export default function GroupDetailPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;
  const { user: currentUser } = useCurrentUser();
  const contractAddress = useContractAddress();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cake, setCake] = useState<Cake | null>(null);
  const [members, setMembers] = useState<MemberWithBalance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    description: '',
    totalAmount: '',
    paidBy: [] as string[], // Array of payer IDs
    useCustomPayerAmounts: false,
    payerAmounts: {} as Record<string, string>, // Map of payer ID to amount
    splitBetween: [] as string[],
    useCustomWeights: false,
    weights: {} as Record<string, number>, // Map of member ID to weight
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    async function fetchCakeData() {
      try {
        setLoading(true);
        setError(null);

        const cakeId = Number.parseInt(groupId, 10);
        if (Number.isNaN(cakeId)) {
          setError('Invalid cake ID');
          return;
        }

        const supabase = createClient();
        const cakesAPI = new CakesAPI(supabase);
        const ingredientsAPI = new IngredientsAPI(supabase);
        const usersAPI = new UsersAPI(supabase);

        // Fetch cake
        const { data: cakeData, error: cakeError } = await cakesAPI.getCake(cakeId);
        if (cakeError || !cakeData) {
          setError(cakeError?.message || 'Cake not found');
          return;
        }
        setCake(cakeData);

        // Check if current user is a member
        if (currentUser) {
          const userIsMember = cakeData.member_ids?.includes(currentUser.id) ?? false;
          setIsMember(userIsMember);

          // If user is not a member, don't fetch sensitive data
          if (!userIsMember) {
            setLoading(false);
            return;
          }
        } else {
          // No user logged in, can't be a member
          setIsMember(false);
          setLoading(false);
          return;
        }

        // Fetch members
        if (cakeData.member_ids && cakeData.member_ids.length > 0) {
          const { data: memberUsers, error: membersError } = await usersAPI.validateUserIds(
            cakeData.member_ids
          );
          if (membersError) {
            console.error('Error fetching members:', membersError);
          } else if (memberUsers) {
            // Calculate balances from current_balances array
            const balances = cakeData.current_balances || [];
            const membersWithBalances: MemberWithBalance[] = memberUsers.map((member, index) => ({
              ...member,
              balance: parseFloat(balances[index] || '0'),
            }));
            setMembers(membersWithBalances);
          }
        }

        // Fetch ingredients
        const { data: ingredientsData, error: ingredientsError } =
          await ingredientsAPI.getCakeIngredients(cakeId);
        if (ingredientsError) {
          console.error('Error fetching ingredients:', ingredientsError);
        } else if (ingredientsData) {
          // Enrich ingredients with user data and calculate shares
          const enrichedExpenses: ExpenseWithDetails[] = await Promise.all(
            ingredientsData.map(async (ingredient) => {
              // Calculate total amount from amounts array
              const amounts = ingredient.amounts || [];
              const totalAmount = amounts.reduce((sum, amt) => sum + parseFloat(amt || '0'), 0);

              // Get payer user data
              let paidByUser: User | undefined;
              if (ingredient.payer_ids && ingredient.payer_ids.length > 0) {
                const { data: payerUser } = await usersAPI.getUser(ingredient.payer_ids[0]);
                paidByUser = payerUser || undefined;
              }

              // Calculate user's share
              let yourShare = 0;
              if (currentUser && ingredient.weights && ingredient.payer_ids) {
                const userIndex = cakeData.member_ids?.indexOf(currentUser.id) ?? -1;
                if (userIndex >= 0 && ingredient.weights[userIndex]) {
                  const totalWeight = ingredient.weights.reduce((sum, w) => sum + (w || 0), 0);
                  const userWeight = ingredient.weights[userIndex] || 0;
                  if (totalWeight > 0) {
                    yourShare = (totalAmount * userWeight) / totalWeight;
                  }
                }
                // If user paid, subtract their payment
                if (ingredient.payer_ids.includes(currentUser.id)) {
                  const payerIndex = ingredient.payer_ids.indexOf(currentUser.id);
                  const paidAmount = parseFloat(amounts[payerIndex] || '0');
                  yourShare -= paidAmount;
                }
              }

              return {
                ...ingredient,
                paidByUser,
                totalAmount,
                yourShare,
              };
            })
          );
          setExpenses(enrichedExpenses);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cake data');
      } finally {
        setLoading(false);
      }
    }

    fetchCakeData();
  }, [groupId, currentUser]);

  // Calculate totals and current user balance
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);

  // Calculate complete balance: on-chain + pending ingredients
  const yourBalance = (() => {
    if (!currentUser || !cake) return 0;

    // Find user's index in member_ids
    const memberIndex = cake.member_ids?.indexOf(currentUser.id) ?? -1;
    if (memberIndex < 0) return 0;

    // Start with on-chain balance
    let balance = Number.parseFloat(cake.current_balances?.[memberIndex] || '0');

    // Add contributions from non-settled ingredients (pending + submitted)
    // Balance convention: positive = you are owed, negative = you owe
    // Only include expenses that haven't been settled (pending or submitted)
    const nonSettledExpenses = expenses.filter((exp) => exp.status === 'pending' || exp.status === 'submitted');
    for (const expense of nonSettledExpenses) {
      if (expense.weights && expense.weights[memberIndex] > 0) {
        const totalWeight = expense.weights.reduce((sum, w) => sum + (w || 0), 0);
        const userWeight = expense.weights[memberIndex] || 0;
        if (totalWeight > 0) {
          const userShare = (expense.totalAmount * userWeight) / totalWeight;
          balance -= userShare; // User owes this share (decrease balance, make more negative)
        }
      }

      // Add amount user paid (if user is a payer)
      if (expense.payer_ids?.includes(currentUser.id)) {
        const payerIndex = expense.payer_ids.indexOf(currentUser.id);
        const paidAmount = Number.parseFloat(expense.amounts?.[payerIndex] || '0');
        balance += paidAmount; // User paid this, so increase balance (make more positive)
      }
    }

    return balance;
  })();

  // Count pending ingredients (not yet submitted on-chain) - for UI widget
  const pendingIngredientsCount = expenses.filter((exp) => exp.status === 'pending').length;
  
  // Count non-settled ingredients (pending + submitted, not yet settled) - for balance calculations
  const nonSettledIngredientsCount = expenses.filter((exp) => exp.status === 'pending' || exp.status === 'submitted').length;

  // Calculate complete balances for all members (including pending ingredients)
  const membersWithCompleteBalances = members.map((member) => {
    if (!cake) return member;

    const memberIndex = cake.member_ids?.indexOf(member.id) ?? -1;
    if (memberIndex < 0) return member;

    // Start with on-chain balance
    let balance = Number.parseFloat(cake.current_balances?.[memberIndex] || '0');

    // Add contributions from non-settled ingredients (pending + submitted)
    // Balance convention: positive = you are owed, negative = you owe
    // Only include expenses that haven't been settled (pending or submitted)
    const nonSettledExpenses = expenses.filter((exp) => exp.status === 'pending' || exp.status === 'submitted');
    for (const expense of nonSettledExpenses) {
      if (expense.weights && expense.weights[memberIndex] > 0) {
        const totalWeight = expense.weights.reduce((sum, w) => sum + (w || 0), 0);
        const userWeight = expense.weights[memberIndex] || 0;
        if (totalWeight > 0) {
          const userShare = (expense.totalAmount * userWeight) / totalWeight;
          balance -= userShare; // User owes this share (decrease balance, make more negative)
        }
      }

      // Add amount user paid (if user is a payer)
      if (expense.payer_ids?.includes(member.id)) {
        const payerIndex = expense.payer_ids.indexOf(member.id);
        const paidAmount = Number.parseFloat(expense.amounts?.[payerIndex] || '0');
        balance += paidAmount; // User paid this, so increase balance (make more positive)
      }
    }

    return {
      ...member,
      balance,
    };
  });

  // Sort by balance descending (highest positive balances first - users owed the most)
  const leaderboard = [...membersWithCompleteBalances]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3);

  const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmitIngredients = async () => {
    if (nonSettledIngredientsCount === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Only submit pending ingredients (not yet submitted on-chain)
      const pendingIngredients = expenses.filter((exp) => exp.status === 'pending');

      if (!cake || !cake.member_ids) {
        throw new Error('Invalid cake data');
      }

      // Aggregate weights from all pending ingredients
      // We need to check if all ingredients use the same weights
      const firstIngredientWeights = pendingIngredients[0]?.weights || [];
      const allWeightsMatch = pendingIngredients.every(
        (ing) =>
          ing.weights?.length === firstIngredientWeights.length &&
          ing.weights?.every((w, i) => w === firstIngredientWeights[i])
      );

      // Prepare the weights array (in BPS - basis points, must sum to 10000)
      // If all weights match, send once; otherwise send empty array to use default
      let weights: number[] = [];
      if (allWeightsMatch && firstIngredientWeights.length > 0) {
        // Weights are already stored in BPS format (0-10000) in the database
        weights = firstIngredientWeights.map((w) => Math.floor(w));
        
        // Validate that weights sum to 10000
        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        if (weightSum !== 10000) {
          throw new Error(
            `Weights must sum to 10000 (100%). Current sum: ${weightSum}. Please ensure all expenses have weights that sum to exactly 10000.`
          );
        }
      } else {
        // Empty array means use default cake weights
        weights = [];
      }

      // Aggregate payer IDs and amounts
      const allPayerIds: bigint[] = [];
      const allAmounts: bigint[] = [];

      for (const ingredient of pendingIngredients) {
        if (ingredient.payer_ids && ingredient.amounts) {
          for (let i = 0; i < ingredient.payer_ids.length; i++) {
            allPayerIds.push(BigInt(ingredient.payer_ids[i]));
            // Convert amount string to wei (assuming 18 decimals)
            const amountInWei = parseUnits(ingredient.amounts[i], 18);
            allAmounts.push(amountInWei);
          }
        }
      }

      if (allPayerIds.length === 0 || allAmounts.length === 0) {
        throw new Error('No valid payers or amounts found');
      }

      // Call the smart contract
      // Note: writeContract doesn't return a promise in wagmi v2
      // Errors are handled via writeError state, user rejection is also handled there
      writeContract({
        address: contractAddress,
        abi: CAKE_FACTORY_ABI,
        functionName: 'addBatchedCakeIngredients',
        args: [
          BigInt(cake.id), // cakeId as uint128
          weights, // weights as uint16[] (can be empty)
          allPayerIds, // payerIds as uint64[]
          allAmounts, // payedAmounts as uint256[]
        ],
      });
      // After calling writeContract, isSubmitting will remain true
      // It will be reset when hash is received (transaction submitted) or on error
    } catch (error) {
      console.error('Error preparing transaction:', error);
      alert('Failed to prepare transaction. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      console.error('Transaction error:', writeError);
      alert(`Transaction failed: ${writeError.message}`);
      setIsSubmitting(false);
    }
  }, [writeError]);

  // Reset submitting state when transaction hash is received (after MetaMask approval)
  // This prevents the UI from appearing frozen after user approves the transaction
  // The transaction is now submitted and we're waiting for confirmation (handled by isConfirming)
  useEffect(() => {
    if (hash && !isWriting) {
      // Transaction was successfully submitted to the network
      // Reset isSubmitting so the UI can show the correct "Confirming on Blockchain..." state
      // isSubmitting will be set to true again when we start updating the database
      setIsSubmitting(false);
    }
  }, [hash, isWriting]);

  // Handle transaction confirmation and update database
  useEffect(() => {
    if (isConfirmed && hash) {
      const updateIngredientStatuses = async () => {
        // Set isSubmitting to true to show "Updating Database..." state
        setIsSubmitting(true);
        try {
          const supabase = createClient();
          const ingredientsAPI = new IngredientsAPI(supabase);
          // Get fresh pending ingredients at confirmation time to avoid stale data
          const { data: ingredientsData } = await ingredientsAPI.getCakeIngredients(
            Number.parseInt(groupId, 10)
          );
          const pendingIngredients =
            ingredientsData?.filter((ing) => ing.status === 'pending') || [];

          // Update all pending ingredients to 'submitted' status
          for (const ingredient of pendingIngredients) {
            await ingredientsAPI.markIngredientSubmitted(ingredient.id, hash);
          }

          // Refresh the page to show updated data
          window.location.reload();
        } catch (error) {
          console.error('Error updating ingredient statuses:', error);
          alert('Transaction confirmed but failed to update statuses. Please refresh the page.');
          setIsSubmitting(false);
        }
      };

      updateIngredientStatuses();
    }
  }, [isConfirmed, hash, groupId]);

  const getCategoryIcon = () => {
    // Default to Utensils icon for expenses
    return <Utensils className="w-5 h-5" />;
  };

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
            <div className="text-4xl mb-4">🍰</div>
            <div className="text-xl font-bold pixel-text text-[#2D3748]">Loading cake...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !cake) {
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
              <div className="text-xl font-bold pixel-text text-[#2D3748] mb-2">
                Error loading cake
              </div>
              <div className="text-sm text-[#4A5568] mb-4">{error || 'Cake not found'}</div>
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
    );
  }

  // Check if user is a member - show unauthorized message if not
  if (isMember === false) {
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
          <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-4 border-[#FF6B6B] max-w-md">
            <div className="text-center">
              <Lock className="w-16 h-16 text-[#FF6B6B] mx-auto mb-4" />
              <div className="text-2xl font-bold pixel-text text-[#2D3748] mb-2">
                Access Restricted
              </div>
              <div className="text-sm text-[#4A5568] mb-6">
                {currentUser
                  ? "You don't have access to this cake. Only members can view cake details."
                  : 'Please connect your wallet and register to access this cake.'}
              </div>
              {!currentUser && (
                <div className="mb-6 flex justify-center">
                  <ConnectButton />
                </div>
              )}
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
    );
  }

  const cakeIcon =
    cake.icon_index !== null && cake.icon_index !== undefined
      ? ICON_OPTIONS[cake.icon_index] || '🍰'
      : '🍰';

  const handleAddExpense = async () => {
    if (!cake || !currentUser) return;

    try {
      setIsSubmitting(true);

      // Validate required fields
      if (
        !newExpense.name.trim() ||
        !newExpense.totalAmount ||
        newExpense.paidBy.length === 0 ||
        newExpense.splitBetween.length === 0
      ) {
        alert('Please fill in all required fields');
        return;
      }

      let totalAmount = Number.parseFloat(newExpense.totalAmount);

      // Get member IDs in display order (from cake.member_ids)
      const memberIds = cake.member_ids || [];

      // Calculate payer amounts (order doesn't matter here, it's just a lookup)
      const payerAmounts: Record<string, string> = {};

      if (newExpense.useCustomPayerAmounts) {
        // Use custom payer amounts - total is sum of payer amounts
        let customTotal = 0;
        // Iterate through display order to calculate amounts
        for (const memberId of memberIds) {
          const memberIdStr = memberId.toString();
          if (newExpense.paidBy.includes(memberIdStr)) {
            const amount = Number.parseFloat(newExpense.payerAmounts[memberIdStr] || '0');
            if (amount <= 0) {
              alert('All payer amounts must be greater than 0');
              return;
            }
            payerAmounts[memberIdStr] = amount.toString();
            customTotal += amount;
          }
        }

        // Update total amount to sum of payer amounts
        totalAmount = customTotal;
      } else {
        // Validate total amount when not using custom payer amounts
        if (Number.isNaN(totalAmount) || totalAmount <= 0) {
          alert('Please enter a valid amount');
          return;
        }
        // Split equally among payers
        const payerCount = newExpense.paidBy.length;
        const amountPerPayer = totalAmount / payerCount;
        // Iterate through display order to set amounts
        for (const memberId of memberIds) {
          const memberIdStr = memberId.toString();
          if (newExpense.paidBy.includes(memberIdStr)) {
            payerAmounts[memberIdStr] = amountPerPayer.toString();
          }
        }
      }

      // Build payer_ids and amounts arrays in the order of cake.member_ids (display order)
      // This ensures consistent ordering regardless of click order
      const payerIds: number[] = [];
      const amounts: string[] = [];
      for (const memberId of memberIds) {
        const memberIdStr = memberId.toString();
        if (newExpense.paidBy.includes(memberIdStr)) {
          payerIds.push(memberId);
          amounts.push(payerAmounts[memberIdStr]);
        }
      }

      // Calculate weights (in order of cake.member_ids) - must sum to 10000 (BPS)
      const BPS_DENOMINATOR = 10000;
      const weights: number[] = [];
      const rawWeights: number[] = [];

      if (newExpense.useCustomWeights) {
        // Use custom weights - collect raw weights
        for (const memberId of memberIds) {
          const memberIdStr = memberId.toString();
          if (newExpense.splitBetween.includes(memberIdStr)) {
            const weight = newExpense.weights[memberIdStr] || 0;
            if (weight <= 0) {
              alert('All weights must be greater than 0');
              return;
            }
            rawWeights.push(weight);
          } else {
            rawWeights.push(0);
          }
        }

        // Calculate total of raw weights
        const totalRawWeight = rawWeights.reduce((sum, w) => sum + w, 0);
        if (totalRawWeight === 0) {
          alert('Total weight must be greater than 0');
          return;
        }

        // Normalize to BPS (sum to 10000)
        let totalBPS = 0;
        for (let i = 0; i < rawWeights.length; i++) {
          if (rawWeights[i] > 0) {
            // Calculate BPS: (rawWeight / totalRawWeight) * 10000
            const bps = Math.round((rawWeights[i] / totalRawWeight) * BPS_DENOMINATOR);
            weights.push(bps);
            totalBPS += bps;
          } else {
            weights.push(0);
          }
        }

        // Adjust for rounding errors - add/subtract difference to last non-zero weight
        const difference = BPS_DENOMINATOR - totalBPS;
        if (difference !== 0) {
          for (let i = weights.length - 1; i >= 0; i--) {
            if (weights[i] > 0) {
              weights[i] += difference;
              break;
            }
          }
        }
      } else {
        // Equal weights - distribute 10000 equally among participants
        const participantCount = newExpense.splitBetween.length;
        if (participantCount === 0) {
          alert('At least one person must be included in the split');
          return;
        }

        const equalWeightBPS = Math.floor(BPS_DENOMINATOR / participantCount);
        let remainingBPS = BPS_DENOMINATOR - (equalWeightBPS * participantCount);

        for (const memberId of memberIds) {
          const memberIdStr = memberId.toString();
          if (newExpense.splitBetween.includes(memberIdStr)) {
            // Add any remainder to the first participant
            const weight = equalWeightBPS + (remainingBPS > 0 ? 1 : 0);
            weights.push(weight);
            if (remainingBPS > 0) remainingBPS--;
          } else {
            weights.push(0);
          }
        }
      }

      // Validate that weights sum to exactly 10000
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      if (weightSum !== BPS_DENOMINATOR) {
        alert(`Weights must sum to 10000 (100%). Current sum: ${weightSum}`);
        return;
      }

      // Prepare ingredient data
      const ingredientData = {
        cake_id: Number.parseInt(groupId, 10),
        name: newExpense.name.trim(),
        description: newExpense.description.trim() || null,
        payer_ids: payerIds,
        amounts: amounts,
        weights: weights,
        status: 'pending' as const,
      };

      // Create ingredient via API
      const supabase = createClient();
      const ingredientsAPI = new IngredientsAPI(supabase);
      const { error } = await ingredientsAPI.createIngredient(ingredientData);

      if (error) {
        console.error('Error creating ingredient:', error);
        alert('Failed to create expense. Please try again.');
        return;
      }

      // Reset form and close modal
      setIsAddExpenseOpen(false);
      setNewExpense({
        name: '',
        description: '',
        totalAmount: '',
        paidBy: [],
        useCustomPayerAmounts: false,
        payerAmounts: {},
        splitBetween: [],
        useCustomWeights: false,
        weights: {},
        date: new Date().toISOString().split('T')[0],
      });

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setNewExpense((prev) => {
      const isIncluded = prev.splitBetween.includes(memberId);
      const newSplitBetween = isIncluded
        ? prev.splitBetween.filter((id) => id !== memberId)
        : [...prev.splitBetween, memberId];

      const newWeights = { ...prev.weights };

      if (prev.useCustomWeights) {
        // If using custom weights, preserve existing values
        if (!isIncluded) {
          // Adding a member - restore previous weight if it exists, otherwise initialize to 1
          if (!newWeights[memberId] || newWeights[memberId] === 0) {
            newWeights[memberId] = 1;
          }
          // If weight already exists in weights, it will be preserved automatically
        }
        // When removing a member, keep their weight in weights so it can be restored
        // Don't delete it - just remove them from splitBetween array
      } else {
        // If not using custom weights, preserve weights when removing so they can be restored
        // Don't delete - weights will be recalculated when needed
      }

      return {
        ...prev,
        splitBetween: newSplitBetween,
        weights: newWeights,
      };
    });
  };

  const togglePayer = (memberId: string) => {
    setNewExpense((prev) => {
      const isPayer = prev.paidBy.includes(memberId);
      const newPaidBy = isPayer
        ? prev.paidBy.filter((id) => id !== memberId)
        : [...prev.paidBy, memberId];

      const newPayerAmounts = { ...prev.payerAmounts };

      if (prev.useCustomPayerAmounts) {
        // If using custom amounts, preserve existing values
        if (!isPayer) {
          // Adding a payer - restore previous amount if it exists, otherwise initialize to 0
          if (!newPayerAmounts[memberId] || newPayerAmounts[memberId] === '') {
            // Initialize new payer with 0 (user can edit)
            newPayerAmounts[memberId] = '0';
          }
          // If amount already exists in payerAmounts, it will be preserved automatically
        }
        // When removing a payer, keep their amount in payerAmounts so it can be restored
        // Don't delete it - just remove them from paidBy array
      } else {
        // If not using custom amounts, preserve amounts when removing so they can be restored
        // Don't delete - amounts will be recalculated when needed
      }

      return {
        ...prev,
        paidBy: newPaidBy,
        payerAmounts: newPayerAmounts,
      };
    });
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
                    {cakeIcon}
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold pixel-text text-[#2D3748] mb-2">
                      {cake.name}
                    </h1>
                    {cake.description && (
                      <p className="text-sm text-[#4A5568] mb-2">{cake.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-[#4A5568]">
                      <Users className="w-4 h-4" />
                      <span>{members.length} members</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-[#4A5568] mb-1">Total Expenses</div>
                  <div className="text-3xl font-bold pixel-text text-[#FF69B4]">
                    ${totalExpenses.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Member Avatars */}
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                {members.map((member) => (
                  <Link
                    key={member.id}
                    href={`/user/${member.id}`}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-12 h-12 bg-[#E9D5FF] pixel-art-shadow flex items-center justify-center text-2xl hover:scale-110 transition-transform cursor-pointer group-hover:border-2 group-hover:border-[#FF69B4]">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.username}
                          className="w-full h-full rounded"
                        />
                      ) : (
                        <span>{member.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-xs text-[#4A5568] group-hover:text-[#FF69B4] transition-colors">
                      {member.username}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Balance Section */}
            {currentUser && (
              <Card
                className={`p-6 mb-6 pixel-card backdrop-blur border-4 ${
                  yourBalance > 0
                    ? 'bg-[#5DD39E]/10 border-[#5DD39E]'
                    : yourBalance < 0
                      ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]'
                      : 'bg-gray-100 border-gray-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-[#4A5568] mb-2">Your Balance</div>
                    <div
                      className={`text-4xl font-bold pixel-text ${
                        yourBalance > 0
                          ? 'text-[#5DD39E]'
                          : yourBalance < 0
                            ? 'text-[#FF6B6B]'
                            : 'text-gray-500'
                      }`}
                    >
                      ${Math.abs(yourBalance).toFixed(2)}
                    </div>
                    <div
                      className={`text-sm mt-1 ${
                        yourBalance > 0
                          ? 'text-[#5DD39E]'
                          : yourBalance < 0
                            ? 'text-[#FF6B6B]'
                            : 'text-gray-500'
                      }`}
                    >
                      {yourBalance > 0
                        ? 'You are owed'
                        : yourBalance < 0
                          ? 'You owe'
                          : 'All settled up'}
                    </div>
                  </div>

                  {yourBalance !== 0 && (
                    <Link href={`/dashboard/${groupId}/settle`}>
                      <Button className="bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="mr-2 text-xl">🍰</div>
                        Settle Up
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            )}

            {/* Expense List */}
            <div className="mb-24">
              <h2 className="text-2xl font-bold pixel-text text-[#2D3748] mb-4">Expenses</h2>

              {expenses.length === 0 ? (
                <Card className="p-8 pixel-card bg-white/80 backdrop-blur border-3 border-[#E9D5FF] text-center">
                  <div className="text-4xl mb-4">🥧</div>
                  <div className="text-lg font-bold pixel-text text-[#2D3748] mb-2">
                    No expenses yet
                  </div>
                  <div className="text-sm text-[#4A5568]">
                    Add your first expense to get started!
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <Link key={expense.id} href={`/dashboard/${groupId}/expense/${expense.id}`}>
                      <Card className="p-4 pixel-card bg-white/80 backdrop-blur border-3 border-[#E9D5FF] hover:border-[#FFB6D9] transition-all cursor-pointer hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-[#FF69B4] flex-shrink-0">
                            {getCategoryIcon()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold pixel-text text-[#2D3748] mb-1">
                              {expense.name}
                            </h3>
                            {expense.description && (
                              <p className="text-xs text-[#718096] mb-1">{expense.description}</p>
                            )}
                            <div className="text-sm text-[#4A5568] flex items-center gap-3 flex-wrap">
                              <span>
                                {expense.paidByUser?.username || 'Unknown'} paid $
                                {expense.totalAmount.toFixed(2)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(expense.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              {expense.status && (
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    expense.status === 'settled'
                                      ? 'bg-[#5DD39E]/20 text-[#5DD39E]'
                                      : expense.status === 'submitted'
                                        ? 'bg-[#FFD700]/20 text-[#FFA500]'
                                        : 'bg-[#E9D5FF]/20 text-[#4A5568]'
                                  }`}
                                >
                                  {expense.status}
                                </span>
                              )}
                            </div>
                            {expense.weights && (
                              <div className="text-xs text-[#718096] mt-1">
                                Split between {expense.weights.filter((w) => w && w > 0).length}{' '}
                                people
                              </div>
                            )}
                          </div>

                          {currentUser && (
                            <div className="text-right flex-shrink-0">
                              <div
                                className={`text-xl font-bold pixel-text ${
                                  expense.yourShare > 0
                                    ? 'text-[#FF6B6B]'
                                    : expense.yourShare < 0
                                      ? 'text-[#5DD39E]'
                                      : 'text-gray-500'
                                }`}
                              >
                                ${Math.abs(expense.yourShare).toFixed(2)}
                              </div>
                              <div
                                className={`text-xs ${
                                  expense.yourShare > 0
                                    ? 'text-[#FF6B6B]'
                                    : expense.yourShare < 0
                                      ? 'text-[#5DD39E]'
                                      : 'text-gray-500'
                                }`}
                              >
                                {expense.yourShare > 0
                                  ? 'You owe'
                                  : expense.yourShare < 0
                                    ? 'You get back'
                                    : 'Settled'}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card className="p-6 pixel-card bg-white/80 backdrop-blur border-4 border-[#E9D5FF]">
                <div className="flex items-center gap-2 mb-6">
                  <Trophy className="w-6 h-6 text-[#FFD700]" />
                  <h2 className="text-2xl font-bold pixel-text text-[#2D3748]">Top Balances</h2>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="text-center text-sm text-[#718096] py-4">No members yet</div>
                ) : (
                  <div className="space-y-4">
                    {leaderboard.map((member, index) => (
                      <Link
                        key={member.id}
                        href={`/user/${member.id}`}
                        className={`flex items-center gap-3 p-4 rounded-lg pixel-art-shadow transition-all hover:-translate-y-1 cursor-pointer group
                        ${
                          index === 0
                            ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border-2 border-[#FFD700] hover:border-[#FF69B4]'
                            : index === 1
                              ? 'bg-gradient-to-r from-[#C0C0C0]/20 to-[#A8A8A8]/20 border-2 border-[#C0C0C0] hover:border-[#FF69B4]'
                              : 'bg-gradient-to-r from-[#CD7F32]/20 to-[#B8860B]/20 border-2 border-[#CD7F32] hover:border-[#FF69B4]'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {index === 0 && <Trophy className="w-6 h-6 text-[#FFD700]" />}
                          {index === 1 && <Medal className="w-6 h-6 text-[#C0C0C0]" />}
                          {index === 2 && <Award className="w-6 h-6 text-[#CD7F32]" />}
                        </div>

                        <div className="w-12 h-12 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-2xl group-hover:border-2 group-hover:border-[#FF69B4] transition-all">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.username}
                              className="w-full h-full rounded"
                            />
                          ) : (
                            <span>{member.username.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="font-bold pixel-text text-[#2D3748] group-hover:text-[#FF69B4] transition-colors">
                            {member.username}
                          </div>
                          <div
                            className={`text-sm ${member.balance >= 0 ? 'text-[#5DD39E]' : 'text-[#FF6B6B]'}`}
                          >
                            ${Math.abs(member.balance).toFixed(2)}
                          </div>
                        </div>

                        <div className="text-2xl font-bold pixel-text text-[#FF69B4]">
                          #{index + 1}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t-2 border-[#E9D5FF]">
                  <div className="text-xs text-center text-[#718096]">
                    Balances show who has paid the most in this group 🎯
                  </div>
                </div>
              </Card>

              {/* Pending Ingredients Widget */}
              <Card
                className={`p-6 pixel-card backdrop-blur border-4 ${
                  pendingIngredientsCount > 0
                    ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]'
                    : 'bg-gray-100/80 border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Upload
                    className={`w-5 h-5 ${
                      pendingIngredientsCount > 0 ? 'text-[#FF6B6B]' : 'text-gray-500'
                    }`}
                  />
                  <h2 className="text-xl font-bold pixel-text text-[#2D3748]">
                    Expenses pending on-chain Submission
                  </h2>
                </div>

                {pendingIngredientsCount === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-sm text-gray-500 font-medium">
                      All ingredients submitted
                    </div>
                    <div className="text-xs text-[#718096] mt-1">
                      No pending ingredients to submit on-chain
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-[#4A5568] mb-2">Pending Ingredients</div>
                      <div
                        className={`text-4xl font-bold pixel-text ${
                          pendingIngredientsCount > 0 ? 'text-[#FF6B6B]' : 'text-gray-500'
                        }`}
                      >
                        {pendingIngredientsCount}
                      </div>
                      <div
                        className={`text-sm mt-1 ${
                          pendingIngredientsCount > 0 ? 'text-[#FF6B6B]' : 'text-gray-500'
                        }`}
                      >
                        {pendingIngredientsCount === 1
                          ? 'ingredient ready to submit on-chain'
                          : 'ingredients ready to submit on-chain'}
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmitIngredients}
                      disabled={
                        isSubmitting || isWriting || isConfirming || pendingIngredientsCount === 0
                      }
                      className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isWriting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Preparing Transaction...
                        </>
                      ) : isConfirming ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Confirming on Blockchain...
                        </>
                      ) : isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Updating Database...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit on-chain
                        </>
                      )}
                    </Button>

                    <div className="flex items-start gap-2 text-xs text-[#718096] bg-white/50 p-2 rounded">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        Submitting ingredients will batch and add them to the blockchain. This
                        action requires a wallet transaction.
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3">
          <Link href={`/dashboard/${groupId}/settle`}>
            <Button className="bg-[#B4E7CE] hover:bg-[#5DD39E] text-[#2D3748] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              Settle Debt
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
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#FFB6D9]/20 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-[#4A5568]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label
                    htmlFor="expense-name"
                    className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                  >
                    Name <span className="text-[#FF6B6B]">*</span>
                  </label>
                  <input
                    id="expense-name"
                    type="text"
                    value={newExpense.name}
                    onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                    placeholder="Expense name (e.g., Dinner, Gas, Groceries)"
                    className="w-full px-4 py-3 border-3 border-[#E9D5FF] rounded pixel-art-shadow focus:border-[#FF69B4] outline-none transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="expense-description"
                    className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                  >
                    Description (optional)
                  </label>
                  <input
                    id="expense-description"
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="Additional details about this expense"
                    className="w-full px-4 py-3 border-3 border-[#E9D5FF] rounded pixel-art-shadow focus:border-[#FF69B4] outline-none transition-colors"
                  />
                </div>

                {/* Total Amount */}
                <div>
                  <label
                    htmlFor="expense-total-amount"
                    className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                  >
                    Total Amount <span className="text-[#FF6B6B]">*</span>
                    {newExpense.useCustomPayerAmounts && newExpense.paidBy.length > 0 && (
                      <span className="text-xs font-normal text-[#4A5568] ml-2">
                        (calculated from payer amounts)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A5568] font-bold">
                      $
                    </span>
                    <input
                      id="expense-total-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={
                        newExpense.useCustomPayerAmounts && newExpense.paidBy.length > 0
                          ? (() => {
                              const sum = Object.values(newExpense.payerAmounts).reduce(
                                (sum, amt) => {
                                  const num = Number.parseFloat(amt || '0') || 0;
                                  return sum + num;
                                },
                                0
                              );
                              // Format to preserve actual decimal precision (up to 10 decimal places, remove trailing zeros)
                              const formatted = sum.toFixed(10);
                              // Remove trailing zeros and the decimal point if not needed
                              return formatted.replace(/\.?0+$/, '') || '0';
                            })()
                          : newExpense.totalAmount
                      }
                      onChange={(e) => {
                        if (newExpense.useCustomPayerAmounts) return; // Don't allow editing when using custom payer amounts
                        const value = e.target.value;
                        setNewExpense((prev) => {
                          const newState = { ...prev, totalAmount: value };
                          // Recalculate equal split amounts if payers are selected
                          if (prev.paidBy.length > 0 && !prev.useCustomPayerAmounts) {
                            const total = Number.parseFloat(value) || 0;
                            const amountPerPayer = total / prev.paidBy.length;
                            const newPayerAmounts = { ...prev.payerAmounts };
                            for (const id of prev.paidBy) {
                              newPayerAmounts[id] = amountPerPayer.toFixed(2);
                            }
                            newState.payerAmounts = newPayerAmounts;
                          }
                          return newState;
                        });
                      }}
                      disabled={newExpense.useCustomPayerAmounts && newExpense.paidBy.length > 0}
                      placeholder="0.00"
                      className={`w-full pl-8 pr-4 py-3 border-3 border-[#E9D5FF] rounded pixel-art-shadow focus:border-[#FF69B4] outline-none transition-colors ${
                        newExpense.useCustomPayerAmounts && newExpense.paidBy.length > 0
                          ? 'bg-gray-100 cursor-not-allowed'
                          : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Paid By - Multiple Selection */}
                <div>
                  <div className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Paid by <span className="text-[#FF6B6B]">*</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {members.map((member) => {
                      const isPayer = newExpense.paidBy.includes(member.id.toString());
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => togglePayer(member.id.toString())}
                          className={`p-3 border-3 rounded pixel-art-shadow transition-all hover:-translate-y-1 ${
                            isPayer
                              ? 'border-[#FF69B4] bg-[#FFB6D9]/20'
                              : 'border-[#E9D5FF] bg-white hover:border-[#FFB6D9]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                isPayer ? 'border-[#FF69B4] bg-[#FF69B4]' : 'border-[#E9D5FF]'
                              }`}
                            >
                              {isPayer && <span className="text-white text-xs">✓</span>}
                            </div>
                            <div className="w-8 h-8 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-lg">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.username}
                                  className="w-full h-full rounded"
                                />
                              ) : (
                                <span>{member.username.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="font-bold pixel-text text-sm">{member.username}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Define Per User Amount Checkbox */}
                  {newExpense.paidBy.length > 0 && (
                    <label
                      htmlFor="use-custom-payer-amounts"
                      className="flex items-center gap-2 cursor-pointer mt-3"
                    >
                      <input
                        id="use-custom-payer-amounts"
                        type="checkbox"
                        checked={newExpense.useCustomPayerAmounts}
                        onChange={(e) => {
                          setNewExpense((prev) => {
                            const useCustom = e.target.checked;
                            const newPayerAmounts = { ...prev.payerAmounts };

                            if (useCustom) {
                              // Only initialize amounts for payers that don't have values yet
                              // Preserve existing values
                              for (const id of prev.paidBy) {
                                if (!newPayerAmounts[id] || newPayerAmounts[id] === '') {
                                  // Only initialize if no value exists
                                  const total = Number.parseFloat(prev.totalAmount) || 0;
                                  const amountPerPayer =
                                    prev.paidBy.length > 0 ? total / prev.paidBy.length : 0;
                                  newPayerAmounts[id] = amountPerPayer.toFixed(2);
                                }
                              }
                            } else {
                              // Clear custom amounts when unchecking
                              for (const id of prev.paidBy) {
                                delete newPayerAmounts[id];
                              }
                            }

                            return {
                              ...prev,
                              useCustomPayerAmounts: useCustom,
                              payerAmounts: newPayerAmounts,
                            };
                          });
                        }}
                        className="w-5 h-5"
                      />
                      <span className="text-sm text-[#4A5568]">Define amount per payer</span>
                    </label>
                  )}

                  {/* Payer Amounts - Only show when checkbox is checked */}
                  {newExpense.paidBy.length > 0 && newExpense.useCustomPayerAmounts && (
                    <div className="space-y-2 p-3 bg-[#FFB6D9]/10 rounded border-2 border-[#FFB6D9] mt-3">
                      <div className="block text-xs font-bold pixel-text text-[#2D3748] mb-2">
                        Amount per payer
                      </div>
                      {newExpense.paidBy.map((payerId) => {
                        const payer = members.find((m) => m.id.toString() === payerId);
                        if (!payer) return null;
                        return (
                          <div key={payerId} className="flex items-center gap-2">
                            <span className="text-sm text-[#4A5568] w-24 truncate">
                              {payer.username}:
                            </span>
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#4A5568] text-sm">
                                $
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newExpense.payerAmounts[payerId] || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setNewExpense((prev) => {
                                    const newPayerAmounts = {
                                      ...prev.payerAmounts,
                                      [payerId]: value,
                                    };
                                    // Total amount is automatically calculated from sum of payer amounts
                                    // No need to update totalAmount here as it's computed in the render
                                    return {
                                      ...prev,
                                      payerAmounts: newPayerAmounts,
                                    };
                                  });
                                }}
                                placeholder="0.00"
                                className="w-full pl-6 pr-2 py-1.5 text-sm border-2 border-[#E9D5FF] rounded focus:border-[#FF69B4] outline-none transition-colors"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Split Between */}
                <div>
                  <div className="block text-sm font-bold pixel-text text-[#2D3748] mb-2">
                    Split between <span className="text-[#FF6B6B]">*</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {members.map((member) => {
                      const isIncluded = newExpense.splitBetween.includes(member.id.toString());
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleMember(member.id.toString())}
                          className={`p-3 border-3 rounded pixel-art-shadow transition-all hover:-translate-y-1 ${
                            isIncluded
                              ? 'border-[#B4E7CE] bg-[#B4E7CE]/20'
                              : 'border-[#E9D5FF] bg-white hover:border-[#B4E7CE]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                isIncluded ? 'border-[#5DD39E] bg-[#5DD39E]' : 'border-[#E9D5FF]'
                              }`}
                            >
                              {isIncluded && <span className="text-white text-xs">✓</span>}
                            </div>
                            <div className="w-8 h-8 bg-[#FFF5F7] pixel-art-shadow flex items-center justify-center text-lg">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.username}
                                  className="w-full h-full rounded"
                                />
                              ) : (
                                <span>{member.username.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="font-bold pixel-text text-sm">{member.username}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Weights Toggle */}
                  <label
                    htmlFor="use-custom-weights"
                    className="flex items-center gap-2 cursor-pointer mb-3"
                  >
                    <input
                      id="use-custom-weights"
                      type="checkbox"
                      checked={newExpense.useCustomWeights}
                      onChange={(e) => {
                        setNewExpense((prev) => {
                          const useCustom = e.target.checked;
                          const newWeights = { ...prev.weights };
                          // Initialize weights to 1 for all split members if enabling custom weights
                          if (useCustom) {
                            for (const id of prev.splitBetween) {
                              if (!newWeights[id]) {
                                newWeights[id] = 1;
                              }
                            }
                          }
                          return {
                            ...prev,
                            useCustomWeights: useCustom,
                            weights: newWeights,
                          };
                        });
                      }}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-[#4A5568]">
                      Use custom weights (defaults to equal weights)
                    </span>
                  </label>

                  {/* Custom Weights Inputs */}
                  {newExpense.useCustomWeights && newExpense.splitBetween.length > 0 && (
                    <div className="space-y-2 p-3 bg-[#B4E7CE]/10 rounded border-2 border-[#B4E7CE]">
                      <div className="block text-xs font-bold pixel-text text-[#2D3748] mb-2">
                        Weight per person (relative weights - will be normalized to sum to 100%)
                      </div>
                      {(() => {
                        // Calculate total weight once for all members
                        const totalWeight = newExpense.splitBetween.reduce(
                          (sum, id) => sum + (newExpense.weights[id] || 0),
                          0
                        );
                        
                        return (
                          <>
                            {newExpense.splitBetween.map((memberId) => {
                              const member = members.find((m) => m.id.toString() === memberId);
                              if (!member) return null;
                              
                              // Calculate percentage for display
                              const currentWeight = newExpense.weights[memberId] || 0;
                              const percentage = totalWeight > 0 
                                ? ((currentWeight / totalWeight) * 100).toFixed(2)
                                : '0.00';
                              
                              return (
                                <div key={memberId} className="flex items-center gap-2">
                                  <span className="text-sm text-[#4A5568] w-24 truncate">
                                    {member.username}:
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={newExpense.weights[memberId] || 1}
                                    onChange={(e) => {
                                      const value = Number.parseFloat(e.target.value) || 0;
                                      if (value <= 0) {
                                        alert('Weight must be greater than 0');
                                        return;
                                      }
                                      setNewExpense((prev) => ({
                                        ...prev,
                                        weights: {
                                          ...prev.weights,
                                          [memberId]: value,
                                        },
                                      }));
                                    }}
                                    className="w-full px-2 py-1.5 text-sm border-2 border-[#E9D5FF] rounded focus:border-[#5DD39E] outline-none transition-colors"
                                  />
                                  <span className="text-xs text-[#4A5568] w-16 text-right">
                                    {percentage}%
                                  </span>
                                </div>
                              );
                            })}
                            <div className="text-xs text-[#4A5568] mt-2 pt-2 border-t border-[#B4E7CE]">
                              Total: {totalWeight > 0 ? '100.00%' : '0.00%'} (normalized to 10000 BPS)
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label
                    htmlFor="expense-date"
                    className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                  >
                    Date
                  </label>
                  <input
                    id="expense-date"
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="w-full px-4 py-3 border-3 border-[#E9D5FF] rounded pixel-art-shadow focus:border-[#FF69B4] outline-none transition-colors"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleAddExpense}
                  disabled={
                    !newExpense.name.trim() ||
                    !newExpense.totalAmount ||
                    newExpense.paidBy.length === 0 ||
                    newExpense.splitBetween.length === 0 ||
                    isSubmitting
                  }
                  className="w-full bg-[#FF69B4] hover:bg-[#FF1493] pixel-button shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding Expense...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Add Expense
                    </>
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
