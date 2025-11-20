'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useLemonWallet } from '@/hooks/use-lemon-wallet';
import { useFarcasterWallet } from '@/hooks/use-farcaster-wallet';

interface HeaderProps {
  /** Optional user avatar/icon to display */
  userIcon?: React.ReactNode;
  /** Whether to show the wallet connect button (default: true) */
  showWalletConnect?: boolean;
}

/**
 * Reusable header component with CakePay branding and Rather Labs logo
 * Automatically detects wallet type and shows appropriate connection UI
 */
export function Header({ userIcon, showWalletConnect = true }: HeaderProps) {
  const lemon = useLemonWallet();
  const farcaster = useFarcasterWallet();

  return (
    <header className="border-b-4 border-[#FFB6D9] bg-white/80 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: CakePay logo and Rather Labs */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-[#FF69B4] pixel-art-shadow flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🍰
              </div>
              <span className="text-2xl font-bold pixel-text text-[#FF69B4]">CakePay</span>
            </Link>

            {/* Rather Labs branding */}
            <div className="hidden md:flex items-center gap-2 text-sm text-[#4A5568]">
              <span>by</span>
              <Link
                href="https://www.ratherlabs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/Logo-dark.svg"
                  alt="Rather Labs"
                  width={80}
                  height={24}
                  className="h-6 w-auto"
                />
              </Link>
            </div>
          </div>

          {/* Right side: Wallet connection and user icon */}
          <div className="flex items-center gap-4">
            {showWalletConnect && (
              <>
                {/* Check hooks directly for immediate detection */}
                {lemon.isLemonApp ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#FFF5E1] border-2 border-[#FFD700] rounded pixel-art-shadow">
                    <Image
                      src="/lemon-logo.svg"
                      alt="Lemon"
                      width={80}
                      height={20}
                      className="h-5 w-auto"
                    />
                  </div>
                ) : farcaster.isInMiniApp ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#F3E5F5] border-2 border-[#9C27B0] rounded pixel-art-shadow">
                    <span className="text-2xl">🟣</span>
                    <span className="text-sm font-bold text-[#2D3748]">Farcaster</span>
                  </div>
                ) : (
                  <ConnectButton />
                )}
              </>
            )}
            {userIcon}
          </div>
        </div>
      </div>
    </header>
  );
}
