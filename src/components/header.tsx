'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface HeaderProps {
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/drawdown', label: 'Drawdown' },
];

export function Header({ onDownloadPdf, isGeneratingPdf }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
                <svg className="h-5 w-5 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-xl text-foreground">RetireWise</h1>
                <p className="text-xs text-muted-foreground">Your path to financial freedom</p>
              </div>
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-[#0c1929]/10 text-[#0c1929] dark:bg-amber-400/20 dark:text-amber-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {onDownloadPdf && (
              <button
                onClick={onDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500 px-4 py-2 text-sm font-medium text-white dark:text-[#0c1929] transition-all hover:shadow-lg hover:shadow-[#0c1929]/20 dark:hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Report
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
