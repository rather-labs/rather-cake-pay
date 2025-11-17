import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rather Cake Pay',
  description: 'Decentralized bill splitting application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
