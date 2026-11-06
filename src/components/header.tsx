'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface HeaderProps {
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/drawdown', label: 'Drawdown' },
  { href: '/safety', label: 'Safety' },
];

export function Header({ onDownloadPdf, isGeneratingPdf }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="hairline-b">
      <div className="mx-auto flex min-h-[52px] max-w-[1200px] items-center justify-between gap-3 px-5 py-2">
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
              <svg className="size-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="hidden text-sm text-ink-12 md:inline">RetireWise</span>
          </div>
          <nav aria-label="Main" className="segmented">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-active={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  className="segmented-option outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {onDownloadPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadPdf}
              disabled={isGeneratingPdf}
              aria-label="Download report"
            >
              {isGeneratingPdf ? <Loader2 className="animate-spin" /> : <Download />}
              <span className="hidden md:inline">{isGeneratingPdf ? 'Generating…' : 'Download report'}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
