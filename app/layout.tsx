import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'ExpenseTrack — Personal Finance Tracker',
  description: 'Track and manage your personal expenses with ease.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-slate-50 antialiased">
        <div className="flex h-screen overflow-hidden">
          <Navigation />
          <main className="flex-1 overflow-y-auto">
            {/* Pad bottom on mobile so content is not hidden behind the bottom nav */}
            <div className="pb-20 md:pb-0 min-h-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
