import { Loader2 } from 'lucide-react';
import { Header } from '@/components/header';

interface PageShellProps {
  children: React.ReactNode;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

export function PageShell({ children, onDownloadPdf, isGeneratingPdf }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header onDownloadPdf={onDownloadPdf} isGeneratingPdf={isGeneratingPdf} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-8 px-5 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-[1200px] px-5 pb-8">
        <p className="text-xs text-ink-10">All projections are estimates and do not constitute financial advice.</p>
      </footer>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-ink-11">
      <Loader2 className="size-4 animate-spin" />
      Loading your forecast…
    </div>
  );
}
