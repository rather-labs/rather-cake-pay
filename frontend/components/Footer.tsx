import Link from 'next/link';
import Image from 'next/image';

/**
 * Reusable footer component with Rather Labs branding
 */
export function Footer() {
  return (
    <footer className="border-t-4 border-[#FFB6D9] bg-white/80 backdrop-blur mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright and CakePay info */}
          <div className="text-center md:text-left">
            <p className="text-sm text-[#4A5568]">
              © 2025 CakePay. Making crypto splits as easy as pie.
            </p>
          </div>

          {/* Rather Labs branding */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-[#4A5568]">Built with ❤️ by</span>
            <Link
              href="https://www.ratherlabs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="/Logo-dark.svg"
                alt="Rather Labs"
                width={100}
                height={30}
                className="h-8 w-auto"
              />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
