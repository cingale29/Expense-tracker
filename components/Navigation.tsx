'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Wallet, Lightbulb } from 'lucide-react';

const navItems = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses',  label: 'Expenses',  icon: Receipt },
  { href: '/insights',  label: 'Insights',  icon: Lightbulb },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-gray-200 min-h-screen">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Wallet size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            ExpenseTrack
          </span>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Data stored locally in your browser.
          </p>
        </div>
      </aside>

      {/* ── Bottom bar (mobile) ── */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-200 flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-3 text-xs font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
