'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { registerUser } from '@/lib/actions/users';
import { useUserContext, WalletType } from '@/contexts/UserContext';
import { createClient } from '@/lib/supabase/client';
import { UsersAPI } from '@/lib/api/users';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { formatAddress } from '@/lib/utils/format';
import { Footer } from 'react-day-picker';
import { CAKE_FACTORY_ABI, CONTRACT_ADDRESS_ETH_SEPOLIA, CAKE_FACTORY_CHAIN_ID } from '@/lib/contracts/cakeFactory';
import { lemonClient } from '@/lib/lemon/client';
import { TransactionResult } from '@lemoncash/mini-app-sdk';

export default function RegisterPage() {
  const router = useRouter();
  const { walletAddress, walletType } = useUserContext();
  const { status: accountStatus } = useAccount();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wagmiReady, setWagmiReady] = useState(false);
  const [userCheckComplete, setUserCheckComplete] = useState(false);

  const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Add effect to handle transaction errors
  useEffect(() => {
    if (writeError) {
      console.error('Transaction error:', writeError);
      setError(`Failed to register on blockchain: ${writeError.message}`);
      setIsRegistering(false);
    }
  }, [writeError]);

  // Add effect to handle successful transaction
  const completeRegistration = useCallback(async () => {
    try {
      if (!walletAddress) return;

      const { data, error: registerError } = await registerUser(
        walletAddress,
        username.trim(),
        avatarUrl.trim() || null
      );

      if (registerError) {
        if (
          registerError.includes('wallet_address') &&
          (registerError.includes('duplicate') || registerError.includes('unique'))
        ) {
          router.push('/dashboard');
          return;
        }
        if (
          registerError.includes('username') &&
          (registerError.includes('duplicate') || registerError.includes('unique'))
        ) {
          setError('This username is already taken. Please choose a different username.');
          return;
        }
        setError(registerError);
        return;
      }

      if (data) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error('Error completing registration:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete registration');
    } finally {
      setIsRegistering(false);
    }
  }, [avatarUrl, router, username, walletAddress]);

  useEffect(() => {
    if (isConfirmed && hash) {
      completeRegistration();
    }
  }, [completeRegistration, hash, isConfirmed]);

  // Wait for wagmi to be ready (status is not 'reconnecting' or initializing)
  useEffect(() => {
    // Wagmi is ready when status is 'connected' or 'disconnected' (not 'reconnecting' or undefined)
    if (accountStatus === 'connected' || accountStatus === 'disconnected') {
      setWagmiReady(true);
    }
  }, [accountStatus]);

  // Check if user is already registered and redirect to dashboard
  // Only run this check after wagmi is ready
  useEffect(() => {
    if (!wagmiReady) {
      return;
    }

    async function checkExistingUser() {
      try {
        // If no wallet is connected, we're done checking
        if (!walletAddress) {
          setUserCheckComplete(true);
          return;
        }

        const supabase = createClient();
        const usersAPI = new UsersAPI(supabase);
        const { data: existingUser } = await usersAPI.getUserByWalletAddress(walletAddress);

        if (existingUser) {
          // User already exists, redirect to dashboard
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        console.error('Error checking existing user:', err);
      } finally {
        setUserCheckComplete(true);
      }
    }

    checkExistingUser();
  }, [walletAddress, router, wagmiReady]);

  // Update loading state when both wagmi and user check are complete
  useEffect(() => {
    if (wagmiReady && userCheckComplete) {
      setIsLoading(false);
    }
  }, [wagmiReady, userCheckComplete]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters long');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      // First, check if user already exists in database
      const supabase = createClient();
      const usersAPI = new UsersAPI(supabase);
      const { data: existingUser } = await usersAPI.getUserByWalletAddress(walletAddress);

      if (existingUser) {
        // User already exists, redirect to dashboard
        router.push('/dashboard');
        return;
      }

      console.log('Registering user on blockchain:', walletAddress);

      if (walletType === WalletType.LEMON) {
        const result = await lemonClient.callContract({
          contractAddress: CONTRACT_ADDRESS_ETH_SEPOLIA,
          functionName: 'registerUser',
          args: [walletAddress as `0x${string}`],
          chainId: CAKE_FACTORY_CHAIN_ID,
          value: '0',
        });

        if (result.result === TransactionResult.SUCCESS && result.data?.txHash) {
          await completeRegistration();
          return;
        }

        if (result.result === TransactionResult.CANCELLED) {
          throw new Error('Transaction cancelled by user');
        }

        if (result.result === TransactionResult.FAILED) {
          throw new Error(result.error?.message || 'Failed to register via Lemon Cash');
        }

        throw new Error('Unexpected response from Lemon Cash');
      }

      writeContract({
        address: CONTRACT_ADDRESS_ETH_SEPOLIA,
        abi: CAKE_FACTORY_ABI,
        functionName: 'registerUser',
        args: [walletAddress as `0x${string}`],
      });
    } catch (err) {
      console.error('Error initiating registration:', err);
      setError(err instanceof Error ? err.message : 'Failed to register');
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] via-[#F0F9F4] to-[#FFF9E5] flex flex-col">
      <Header />

      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        {isLoading ? (
          <Card className="w-full max-w-md pixel-card bg-white border-4 border-[#FFB6D9]">
            <div className="p-8 text-center">
              <div className="text-4xl mb-4 animate-bounce">🍰</div>
              <p className="text-[#4A5568]">Loading...</p>
            </div>
          </Card>
        ) : (
          <Card className="w-full max-w-md pixel-card bg-white border-4 border-[#FFB6D9]">
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-[#FF69B4] pixel-art-shadow flex items-center justify-center text-4xl mx-auto mb-4">
                  🍰
                </div>
                <h1 className="text-3xl font-bold pixel-text text-[#2D3748] mb-2">
                  Welcome to CakePay
                </h1>
                <p className="text-[#4A5568]">Create your account to get started</p>
              </div>

              {!walletAddress ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#FFF5F7] border-4 border-[#FFB6D9] rounded">
                    <p className="text-sm text-[#2D3748] mb-4">
                      Please connect your wallet to continue with registration.
                    </p>
                    <div className="flex justify-center">
                      <ConnectButton />
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-6">
                  <div>
                    <label
                      htmlFor="wallet-address"
                      className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                    >
                      Wallet Address
                    </label>
                    <div className="px-4 py-3 border-4 border-[#B4E7CE] pixel-art-shadow bg-[#F0F9F4] font-mono text-sm text-[#2D3748] break-all">
                      {formatAddress(walletAddress)}
                    </div>
                    <p className="text-xs text-[#4A5568] mt-1">Connected wallet address</p>
                  </div>

                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                    >
                      Username *
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full px-4 py-3 border-4 border-[#FFB6D9] focus:border-[#FF69B4] outline-none pixel-art-shadow bg-white"
                      required
                      minLength={2}
                    />
                    <p className="text-xs text-[#4A5568] mt-1">
                      This will help others find you when adding members to groups (minimum 2
                      characters)
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="avatar-url"
                      className="block text-sm font-bold pixel-text text-[#2D3748] mb-2"
                    >
                      Avatar URL (optional)
                    </label>
                    <input
                      id="avatar-url"
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-4 py-3 border-4 border-[#FFB6D9] focus:border-[#FF69B4] outline-none pixel-art-shadow bg-white"
                    />
                    <p className="text-xs text-[#4A5568] mt-1">
                      URL to your profile picture or avatar image
                    </p>
                    {avatarUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <Image
                          src={avatarUrl}
                          alt="Avatar preview"
                          width={48}
                          height={48}
                          className="rounded-full border-2 border-[#FFB6D9] object-cover"
                          unoptimized
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span className="text-xs text-[#4A5568]">Preview</span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] rounded">
                      <p className="text-sm text-[#FF6B6B]">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      isRegistering ||
                      isWriting ||
                      isConfirming ||
                      !username.trim() ||
                      username.trim().length < 2
                    }
                    className="w-full bg-[#FF69B4] hover:bg-[#FF1493] pixel-button disabled:opacity-50 disabled:cursor-not-allowed"
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
                    ) : isRegistering ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Completing Registration...
                      </>
                    ) : (
                      'Register'
                    )}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-[#4A5568]">
                  Already have an account?{' '}
                  <Link href="/dashboard" className="text-[#FF69B4] hover:text-[#FF1493] font-bold">
                    Go to Dashboard
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
